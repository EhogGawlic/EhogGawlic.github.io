const BODY_FLOATS = 6          // x, y, r, w, fixed, kind  (24 bytes, matches shader.wgsl)
const GPU_MIN_BODIES = 1500    // below this the wasm/JS path is usually faster than a GPU round trip
const BIG_FACTOR = 2.5         // radius > BIG_FACTOR * mean radius => "big" (tested directly, not in the grid)
const GRID_MAX = 128           // max cells per axis (before +1), same as main.cpp
const GRID_DIM = GRID_MAX + 1
const MAX_CELLS = GRID_DIM * GRID_DIM

let gpThings = {
    device: null, shader: null,
    pipelines: { clear: null, build: null, collide: null },
    bindGroupLayout: null,
    buffers: [null, null],        // ping-pong body buffers
    bindGroups: [null, null],     // [A->B, B->A]
    paramBuffer: null, headsBuffer: null, nextBuffer: null, bigsBuffer: null, stagingBuffer: null,
    scratch: null,                // CPU-side Float32Array for body upload
    bigScratch: null,             // CPU-side Uint32Array of big-ball indices
    capacity: 0,                  // bodies the buffers can hold
    busy: false,
}

async function initWebGPU() {
    const adapter = await navigator.gpu?.requestAdapter()
    console.log(adapter)
    gpThings.device = await adapter?.requestDevice()
    const device = gpThings.device
    if (!device) {
        alert("WebGPU is not supported on your browser. Please switch to a browser that supports WebGPU.")
        return false
    }
    const shaderSrc = await fetch("./shader.wgsl").then(res => res.text())
    gpThings.shader = device.createShaderModule({ code: shaderSrc })
    const info = await gpThings.shader.getCompilationInfo()
    for (const m of info.messages) console.warn(`WGSL ${m.type} @${m.lineNum}:${m.linePos} ${m.message}`)

    // Explicit layout so ONE bind group serves all three entry points
    // (with layout:"auto" each pipeline would only get the bindings it uses).
    const C = GPUShaderStage.COMPUTE
    gpThings.bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: C, buffer: { type: "read-only-storage" } }, // bodiesIn
            { binding: 1, visibility: C, buffer: { type: "storage" } },           // bodiesOut
            { binding: 2, visibility: C, buffer: { type: "uniform" } },           // params
            { binding: 3, visibility: C, buffer: { type: "storage" } },           // heads
            { binding: 4, visibility: C, buffer: { type: "storage" } },           // next
            { binding: 5, visibility: C, buffer: { type: "read-only-storage" } }, // bigs
        ],
    })
    const layout = device.createPipelineLayout({ bindGroupLayouts: [gpThings.bindGroupLayout] })
    const mk = entryPoint => device.createComputePipeline({
        layout, compute: { module: gpThings.shader, entryPoint },
    })
    gpThings.pipelines = { clear: mk("clearGrid"), build: mk("buildGrid"), collide: mk("collide") }

    gpThings.paramBuffer = device.createBuffer({
        label: "Params", size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    gpThings.headsBuffer = device.createBuffer({
        label: "Grid heads", size: MAX_CELLS * 4, usage: GPUBufferUsage.STORAGE,
    })
    return true
}

// Grow per-ball buffers when the ball count exceeds capacity (doubles, so this rarely runs)
function ensureCapacity(n) {
    const g = gpThings
    if (n <= g.capacity) return
    const cap = Math.max(n, g.capacity * 2, 2048)
    const bodyBytes = cap * BODY_FLOATS * 4
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST

    g.buffers.forEach(b => b && b.destroy())
    g.stagingBuffer && g.stagingBuffer.destroy()
    g.nextBuffer && g.nextBuffer.destroy()
    g.bigsBuffer && g.bigsBuffer.destroy()

    g.buffers = [
        g.device.createBuffer({ label: "Bodies A", size: bodyBytes, usage }),
        g.device.createBuffer({ label: "Bodies B", size: bodyBytes, usage }),
    ]
    g.stagingBuffer = g.device.createBuffer({
        label: "Staging", size: bodyBytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
    g.nextBuffer = g.device.createBuffer({ label: "Grid next", size: cap * 4, usage: GPUBufferUsage.STORAGE })
    g.bigsBuffer = g.device.createBuffer({
        label: "Bigs", size: cap * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    g.scratch = new Float32Array(cap * BODY_FLOATS)
    g.bigScratch = new Uint32Array(cap)

    const mkBG = (inp, out) => g.device.createBindGroup({
        layout: g.bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: inp } },
            { binding: 1, resource: { buffer: out } },
            { binding: 2, resource: { buffer: g.paramBuffer } },
            { binding: 3, resource: { buffer: g.headsBuffer } },
            { binding: 4, resource: { buffer: g.nextBuffer } },
            { binding: 5, resource: { buffer: g.bigsBuffer } },
        ],
    })
    g.bindGroups = [mkBG(g.buffers[0], g.buffers[1]), mkBG(g.buffers[1], g.buffers[0])]
    g.capacity = cap
}

// Drop-in for collideAllWasm(objs): resolves ball-ball overlaps on the GPU and writes the
// corrected positions back into objs[i].p. Returns true if it handled the collisions,
// false if the caller should fall back (no WebGPU, too few balls, busy, or error).
async function collideAllGPU(objs, iterations = 1) {
    const g = gpThings
    const n = objs.length
    if (!g.device || !g.pipelines.collide || g.busy || n < GPU_MIN_BODIES) return false
    g.busy = true
    try {
        ensureCapacity(n)

        // ---- CPU prep (O(n)): classify small/big, pack bodies, grid bounds ----
        let sumR = 0, active = 0
        for (let i = 0; i < n; i++) { const r = objs[i].r; if (r > 0) { sumR += r; active++ } }
        if (active < 2) return true                       // nothing can collide
        const bigThreshold = BIG_FACTOR * (sumR / active)

        const data = g.scratch, bigs = g.bigScratch
        let bigCount = 0, smallCount = 0
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxR = 0
        for (let i = 0; i < n; i++) {
            const o = objs[i], k = i * BODY_FLOATS
            const big = o.r > bigThreshold
            data[k] = o.p.x; data[k + 1] = o.p.y
            data[k + 2] = o.r; data[k + 3] = o.w
            data[k + 4] = o.f ? 1 : 0
            data[k + 5] = big ? 1 : 0
            if (o.r <= 0) continue
            if (big) { bigs[bigCount++] = i; continue }
            smallCount++
            if (o.p.x < minX) minX = o.p.x
            if (o.p.x > maxX) maxX = o.p.x
            if (o.p.y < minY) minY = o.p.y
            if (o.p.y > maxY) maxY = o.p.y
            if (o.r > maxR) maxR = o.r
        }
        if (smallCount === 0) { minX = minY = 0; maxX = maxY = 0; maxR = 1 }

        // cell >= 2*maxSmallR (any overlapping small pair is in neighbouring cells),
        // and large enough to stay within GRID_MAX cells per axis
        const extX = maxX - minX, extY = maxY - minY
        const cell = Math.max(2 * maxR, Math.max(extX, extY) / GRID_MAX)
        const inv = 1 / cell
        const gw = Math.min(Math.floor(extX * inv) + 1, GRID_DIM)
        const gh = Math.min(Math.floor(extY * inv) + 1, GRID_DIM)
        const cells = gw * gh

        const q = g.device.queue
        q.writeBuffer(g.buffers[0], 0, data, 0, n * BODY_FLOATS)
        if (bigCount) q.writeBuffer(g.bigsBuffer, 0, bigs, 0, bigCount)
        const pb = new ArrayBuffer(32)
        new Uint32Array(pb).set([n, bigCount, gw, gh], 0)
        new Float32Array(pb).set([minX, minY, inv], 4)
        q.writeBuffer(g.paramBuffer, 0, pb)

        // ---- GPU: `iterations` x (clear grid, build grid, collide), ping-ponging bodies ----
        const enc = g.device.createCommandEncoder()
        let cur = 0
        for (let it = 0; it < iterations; it++) {
            const pass = enc.beginComputePass()
            pass.setBindGroup(0, g.bindGroups[cur])
            pass.setPipeline(g.pipelines.clear);   pass.dispatchWorkgroups(Math.ceil(cells / 64))
            pass.setPipeline(g.pipelines.build);   pass.dispatchWorkgroups(Math.ceil(n / 64))
            pass.setPipeline(g.pipelines.collide); pass.dispatchWorkgroups(Math.ceil(n / 64))
            pass.end()
            cur ^= 1
        }
        const bytes = n * BODY_FLOATS * 4
        enc.copyBufferToBuffer(g.buffers[cur], 0, g.stagingBuffer, 0, bytes)
        q.submit([enc.finish()])

        await g.stagingBuffer.mapAsync(GPUMapMode.READ, 0, bytes)
        const out = new Float32Array(g.stagingBuffer.getMappedRange(0, bytes))

        // If balls were added/removed while we awaited, indices no longer line up: bail out
        if (objs.length !== n) { g.stagingBuffer.unmap(); return false }

        for (let i = 0; i < n; i++) {
            const o = objs[i]
            if (o.f) continue
            const k = i * BODY_FLOATS
            o.p.x = out[k]; o.p.y = out[k + 1]
        }
        g.stagingBuffer.unmap()
        return true
    } catch (e) {
        console.warn("collideAllGPU failed, falling back:", e)
        return false
    } finally {
        g.busy = false
    }
}