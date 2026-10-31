// GPU broadphase + narrowphase for position-based (Verlet) ball collisions.
//
// Per iteration, three dispatches share one bind group:
//   clearGrid : reset the per-cell linked-list heads
//   buildGrid : every SMALL ball pushes itself onto its cell's linked list (atomicExchange)
//   collide   : one thread per ball computes ONLY its own position correction (Jacobi style)
//                 small ball -> its 3x3 neighbouring cells + every BIG ball
//                 big ball   -> every other ball (big balls are not in the grid)
//
// Big balls are kept out of the grid so one huge ball can't inflate the cell size.
// Contact rules mirror Obj.collideball (phys.js) / collideBalls (main.cpp).

struct Body {
    pos: vec2f,
    r: f32,
    w: f32,
    fixed: f32,   // 1.0 = fixed
    kind: f32,    // 1.0 = big (direct-tested), 0.0 = small (grid)
}

struct Params {
    count: u32,
    bigCount: u32,
    gw: u32,
    gh: u32,
    minX: f32,
    minY: f32,
    invCell: f32,
    _pad: u32,
}

const NONE: u32 = 0xFFFFFFFFu;

@group(0) @binding(0) var<storage, read>       bodiesIn:  array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform>             params: Params;
@group(0) @binding(3) var<storage, read_write> heads: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> next: array<u32>;
@group(0) @binding(5) var<storage, read>       bigs: array<u32>;

fn cellOf(p: vec2f) -> vec2i {
    let c = vec2i(floor((p - vec2f(params.minX, params.minY)) * params.invCell));
    return clamp(c, vec2i(0), vec2i(i32(params.gw) - 1, i32(params.gh) - 1));
}

// Returns (correction.xy, 1.0) if overlapping, else zeros. Mirrors collideBalls for `me`'s side.
fn contact(me: Body, o: Body, i: u32, j: u32) -> vec3f {
    let delta = me.pos - o.pos;
    let rsum = me.r + o.r;
    let d2 = dot(delta, delta);
    if (d2 >= rsum * rsum) { return vec3f(0.0); }

    // Exactly coincident: deterministic nudge (the JS/wasm use random jitter on acceleration)
    if (d2 < 1e-12) { return vec3f(select(-0.01, 0.01, i > j), 0.0, 1.0); }

    let d = sqrt(d2);
    let n = delta / d;

    if (o.fixed > 0.5) {
        return vec3f(n * (rsum - d), 1.0);           // snap to touching
    }

    var w1 = me.w;
    var w2 = o.w;
    if (me.r > o.r) { w1 = me.w * (me.r / o.r); }
    else            { w2 = o.w * (o.r / me.r); }
    if (w1 + w2 <= 0.0) { return vec3f(0.0); }
    let share = (w2 / (w1 + w2)) * (me.r / rsum);
    return vec3f(n * share * (rsum - d), 1.0);
}

@compute @workgroup_size(64)
fn clearGrid(@builtin(global_invocation_id) gid: vec3u) {
    if (gid.x < params.gw * params.gh) {
        atomicStore(&heads[gid.x], NONE);
    }
}

@compute @workgroup_size(64)
fn buildGrid(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.count) { return; }
    let b = bodiesIn[i];
    if (b.r <= 0.0 || b.kind > 0.5) { return; }
    let c = cellOf(b.pos);
    let idx = u32(c.y) * params.gw + u32(c.x);
    next[i] = atomicExchange(&heads[idx], i);
}

@compute @workgroup_size(64)
fn collide(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.count) { return; }

    var me = bodiesIn[i];
    if (me.fixed > 0.5 || me.r <= 0.0) {
        bodiesOut[i] = me;
        return;
    }

    var acc = vec3f(0.0);

    if (me.kind > 0.5) {
        // Big ball: test against everything
        for (var j = 0u; j < params.count; j++) {
            if (j == i) { continue; }
            let o = bodiesIn[j];
            if (o.r <= 0.0) { continue; }
            acc += contact(me, o, i, j);
        }
    } else {
        // Small ball: 3x3 neighbourhood of the grid...
        let c = cellOf(me.pos);
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                let nx = c.x + dx;
                let ny = c.y + dy;
                if (nx < 0 || ny < 0 || nx >= i32(params.gw) || ny >= i32(params.gh)) { continue; }
                var j = atomicLoad(&heads[u32(ny) * params.gw + u32(nx)]);
                while (j != NONE) {
                    if (j != i) { acc += contact(me, bodiesIn[j], i, j); }
                    j = next[j];
                }
            }
        }
        // ...plus every big ball
        for (var k = 0u; k < params.bigCount; k++) {
            let j = bigs[k];
            acc += contact(me, bodiesIn[j], i, j);
        }
    }

    // Average over contacts so a ball in a pile isn't over-corrected by many neighbours at once
    if (acc.z > 0.0) { me.pos += acc.xy / acc.z; }
    bodiesOut[i] = me;
}