let wasmCollisionReady = false;
let wasmCollisionExports;
let wasmCollisionOffset = 0;
let wasmScratchOffset = 0;
const wasmBallStride = 7;

async function initializeWasmCollisions() {
  try {
    const response = await fetch("./main.wasm");
    if (!response.ok) {
      throw new Error(`WASM request failed: ${response.status}`);
    }
    const { instance } = await WebAssembly.instantiate(
      await response.arrayBuffer(),
      {},
    );
    wasmCollisionExports = instance.exports;
    const heapBase = wasmCollisionExports.__heap_base;
    wasmCollisionOffset =
      ((heapBase instanceof WebAssembly.Global ? heapBase.value : heapBase) +
        15) &
      ~15;
    if (!wasmCollisionExports.memory || !wasmCollisionExports.collideAllBalls) {
      throw new Error("WASM collision exports are missing");
    }
    wasmCollisionReady = true;
  } catch (error) {
    console.error("WASM collisions unavailable; using JavaScript", error);
  }
}

initializeWasmCollisions();

function beginWasmBallCollisions(objects) {
  if (!wasmCollisionReady) return false;
  try {
    const memory = wasmCollisionExports.memory;
    const floatCount = objects.length * wasmBallStride;
    const ballBytes = floatCount * Float32Array.BYTES_PER_ELEMENT;
    // grid scratch (cell ids, sorted order, cell starts) lives right after the balls
    wasmScratchOffset = (wasmCollisionOffset + ballBytes + 15) & ~15;
    const scratchBytes =
      wasmCollisionExports.gridScratchInts(objects.length) * Int32Array.BYTES_PER_ELEMENT;
    const requiredBytes = wasmScratchOffset + scratchBytes;
    const missingBytes = requiredBytes - memory.buffer.byteLength;
    if (missingBytes > 0) {
      memory.grow(Math.ceil(missingBytes / 65536));
    }

    const balls = new Float32Array(memory.buffer, wasmCollisionOffset, floatCount);
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      const offset = i * wasmBallStride;
      balls[offset] = object.p.x;
      balls[offset + 1] = object.p.y;
      balls[offset + 2] = object.r;
      balls[offset + 3] = object.w;
      balls[offset + 4] = object.f ? 1 : 0;
      balls[offset + 5] = object.a.x;
      balls[offset + 6] = object.a.y;
    }
    return true;
  } catch (error) {
    wasmCollisionReady = false;
    console.error("WASM collision setup failed; using JavaScript", error);
    return false;
  }
}

function runWasmBallCollisionsForObject(index, object) {
  try {
    const offset = index * wasmBallStride;
    wasmCollisionExports.collideBallForObject(
      wasmCollisionOffset,
      objs.length,
      index,
    );
    const balls = new Float32Array(
      wasmCollisionExports.memory.buffer,
      wasmCollisionOffset,
      objs.length * wasmBallStride,
    );
    object.p.x = balls[offset];
    object.p.y = balls[offset + 1];
    object.a.x = balls[offset + 5];
    object.a.y = balls[offset + 6];
    return true;
  } catch (error) {
    wasmCollisionReady = false;
    console.error("WASM collision call failed; using JavaScript", error);
    return false;
  }
}

function syncWasmBallPosition(index, object) {
  if (!wasmCollisionReady) return;
  const balls = new Float32Array(
    wasmCollisionExports.memory.buffer,
    wasmCollisionOffset,
    objs.length * wasmBallStride,
  );
  const offset = index * wasmBallStride;
  balls[offset] = object.p.x;
  balls[offset + 1] = object.p.y;
}

// One wasm call per substep: upload, grid-accelerated collisions, copy everything back.
function collideAllWasm(objects) {
  if (!beginWasmBallCollisions(objects)) return false;
  try {
    const fn = wasmCollisionExports.collideAllBallsGrid;
    if (fn) {
      fn(wasmCollisionOffset, objects.length, wasmScratchOffset);
    } else {
      wasmCollisionExports.collideAllBalls(wasmCollisionOffset, objects.length);
    }
    const balls = new Float32Array(
      wasmCollisionExports.memory.buffer,
      wasmCollisionOffset,
      objects.length * wasmBallStride,
    );
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      const k = i * wasmBallStride;
      o.p.x = balls[k];
      o.p.y = balls[k + 1];
      o.a.x = balls[k + 5];
      o.a.y = balls[k + 6];
    }
    return true;
  } catch (error) {
    wasmCollisionReady = false;
    console.error("WASM collision call failed; using JavaScript", error);
    return false;
  }
}