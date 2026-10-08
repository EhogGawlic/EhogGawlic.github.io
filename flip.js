/*

Hey, you.
Yeah, you.

Do not judge me for the fact that I use Claude for this.
I do not understand FLIP physics. I do not understand
rigidbodies. I only understand Verlet physics and collisions.

I am AI neutral btw

*/

/*
 * flip.js - 2D FLIP/PIC fluid solver for the physics sandbox.
 *
 * Particles keep their own positions and velocities. Every tick:
 *   1. particles -> grid   : splat particle velocities onto a staggered (MAC) grid
 *   2. project             : make the grid velocity field divergence-free (incompressible)
 *   3. grid -> particles   : write the result back (mostly as a *change*, that's the "FLIP" part)
 *
 * Units: pixels and ticks (one call to step() == one physics tick, dt = 1).
 * Grid layout: index = i * ny + j, i = column (x), j = row (y, pointing down like the canvas).
 *   u[i,j] = x-velocity on the LEFT face of cell (i,j)
 *   v[i,j] = y-velocity on the TOP  face of cell (i,j)
 */

const FLIP_AIR = 0, FLIP_FLUID = 1, FLIP_SOLID = 2;

class FlipFluid {
  /**
   * @param {Object} o
   * @param {number} o.minX     left wall x
   * @param {number} o.maxX     right wall x
   * @param {number} o.minY     top of the grid (open air above the water)
   * @param {number} o.maxY     floor y
   * @param {number} o.particleRadius  collision radius of one water particle (px)
   * @param {number} [o.cell]   cell size in px (default 3.3 * particleRadius, ~3 particles per cell)
   */
  constructor(o) {
    this.particleRadius = o.particleRadius;
    this.h = o.cell || o.particleRadius * 3.3;
    const h = this.h;

    this.ox = o.minX - h;               // grid origin (one solid border cell outside the box)
    this.oy = o.minY - h;
    this.nx = Math.ceil((o.maxX - o.minX) / h) + 2;
    this.ny = Math.ceil((o.maxY - o.minY) / h) + 2;
    const N = this.nx * this.ny;

    this.walls = Object.assign({ left: true, right: true, bottom: true, top: false }, o.walls);

    // tuning knobs
    this.flipRatio  = o.flipRatio  ?? 0.9;   // 0 = pure PIC (smooth, viscous), 1 = pure FLIP (lively, noisy)
    this.iterations = o.iterations ?? 30;    // Gauss-Seidel passes; more = more incompressible, slower
    this.overRelax  = o.overRelax  ?? 1.9;   // 1..2, speeds up convergence
    this.driftK     = o.driftK     ?? 0.25;  // how hard to push particles apart where they're too dense
    // particles per cell when packed hexagonally; compression above this gets pushed out
    this.restDensity = o.restDensity ?? (h * h) / (2 * Math.sqrt(3) * o.particleRadius ** 2);

    this.u = new Float32Array(N);  this.v = new Float32Array(N);
    this.du = new Float32Array(N); this.dv = new Float32Array(N);
    this.prevU = new Float32Array(N); this.prevV = new Float32Array(N);
    this.s = new Float32Array(N);              // 1 = open, 0 = solid
    this.cellType = new Uint8Array(N);
    this.density = new Float32Array(N);
    this.fluidList = new Int32Array(N);
    this.fluidCount = 0;

    this.clearObstacles();
  }

  /** Reset to just the box walls. Call before re-adding obstacles each tick if they move. */
  clearObstacles() {
    const { nx, ny, s, walls } = this;
    s.fill(1);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        if ((i === 0 && walls.left) || (i === nx - 1 && walls.right) ||
            (j === ny - 1 && walls.bottom) || (j === 0 && walls.top)) {
          s[i * ny + j] = 0;
        }
      }
    }
  }

  /** Mark every cell whose centre is inside the circle as solid. */
  addCircle(cx, cy, r) {
    const { nx, ny, h, ox, oy, s } = this;
    const i0 = Math.max(0, Math.floor((cx - r - ox) / h)), i1 = Math.min(nx - 1, Math.floor((cx + r - ox) / h));
    const j0 = Math.max(0, Math.floor((cy - r - oy) / h)), j1 = Math.min(ny - 1, Math.floor((cy + r - oy) / h));
    for (let i = i0; i <= i1; i++) {
      const x = ox + (i + 0.5) * h - cx;
      for (let j = j0; j <= j1; j++) {
        const y = oy + (j + 0.5) * h - cy;
        if (x * x + y * y <= r * r) s[i * ny + j] = 0;
      }
    }
  }

  /** Mark every cell whose centre is within halfWidth of the segment as solid. */
  addSegment(x1, y1, x2, y2, halfWidth) {
    const { nx, ny, h, ox, oy, s } = this;
    const minx = Math.min(x1, x2) - halfWidth, maxx = Math.max(x1, x2) + halfWidth;
    const miny = Math.min(y1, y2) - halfWidth, maxy = Math.max(y1, y2) + halfWidth;
    const i0 = Math.max(0, Math.floor((minx - ox) / h)), i1 = Math.min(nx - 1, Math.floor((maxx - ox) / h));
    const j0 = Math.max(0, Math.floor((miny - oy) / h)), j1 = Math.min(ny - 1, Math.floor((maxy - oy) / h));
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const hw2 = halfWidth * halfWidth;
    for (let i = i0; i <= i1; i++) {
      const px = ox + (i + 0.5) * h;
      for (let j = j0; j <= j1; j++) {
        const py = oy + (j + 0.5) * h;
        let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = px - (x1 + t * dx), qy = py - (y1 + t * dy);
        if (qx * qx + qy * qy <= hw2) s[i * ny + j] = 0;
      }
    }
  }

  /**
   * Advance the fluid one tick.
   * @param {Float32Array} pos  [x0,y0,x1,y1,...]  particle positions (read only)
   * @param {Float32Array} vel  [vx0,vy0,...]      particle velocities (in: after forces, out: after pressure)
   * @param {number} n          particle count
   */
  step(pos, vel, n) {
    this._toGrid(pos, vel, n);
    this._updateDensity(pos, n);
    this._project();
    this._toParticles(pos, vel, n);
  }

  // ---------------------------------------------------------------- 1. particles -> grid
  _toGrid(pos, vel, n) {
    const { nx, ny, h, ox, oy, cellType, s } = this;
    const h1 = 1 / h, h2 = 0.5 * h;

    this.u.fill(0); this.v.fill(0); this.du.fill(0); this.dv.fill(0);

    // which cells are solid / contain water / are air
    for (let c = 0; c < nx * ny; c++) cellType[c] = s[c] === 0 ? FLIP_SOLID : FLIP_AIR;
    for (let p = 0; p < n; p++) {
      let xi = Math.floor((pos[2 * p] - ox) * h1), yi = Math.floor((pos[2 * p + 1] - oy) * h1);
      xi = xi < 0 ? 0 : xi > nx - 1 ? nx - 1 : xi;
      yi = yi < 0 ? 0 : yi > ny - 1 ? ny - 1 : yi;
      const c = xi * ny + yi;
      if (cellType[c] === FLIP_AIR) cellType[c] = FLIP_FLUID;
    }

    for (let comp = 0; comp < 2; comp++) {
      const f = comp === 0 ? this.u : this.v;
      const d = comp === 0 ? this.du : this.dv;
      const dx = comp === 0 ? 0 : h2;      // u lives at (i*h, (j+.5)h), v at ((i+.5)h, j*h)
      const dy = comp === 0 ? h2 : 0;
      for (let p = 0; p < n; p++) {
        let x = pos[2 * p] - ox, y = pos[2 * p + 1] - oy;
        x = x < h ? h : x > (nx - 1) * h ? (nx - 1) * h : x;
        y = y < h ? h : y > (ny - 1) * h ? (ny - 1) * h : y;
        const x0 = Math.min(Math.floor((x - dx) * h1), nx - 2);
        const tx = ((x - dx) - x0 * h) * h1;
        const x1 = Math.min(x0 + 1, nx - 2);
        const y0 = Math.min(Math.floor((y - dy) * h1), ny - 2);
        const ty = ((y - dy) - y0 * h) * h1;
        const y1 = Math.min(y0 + 1, ny - 2);
        const sx = 1 - tx, sy = 1 - ty;
        const d0 = sx * sy, d1 = tx * sy, d2 = tx * ty, d3 = sx * ty;
        const pv = vel[2 * p + comp];
        const n0 = x0 * ny + y0, n1 = x1 * ny + y0, n2 = x1 * ny + y1, n3 = x0 * ny + y1;
        f[n0] += pv * d0; d[n0] += d0;
        f[n1] += pv * d1; d[n1] += d1;
        f[n2] += pv * d2; d[n2] += d2;
        f[n3] += pv * d3; d[n3] += d3;
      }
      for (let c = 0; c < f.length; c++) if (d[c] > 0) f[c] /= d[c];
    }

    // faces touching a solid cell don't move (solids are treated as stationary)
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const c = i * ny + j;
        const solid = cellType[c] === FLIP_SOLID;
        if (solid || (i > 0 && cellType[c - ny] === FLIP_SOLID)) this.u[c] = 0;
        if (solid || (j > 0 && cellType[c - 1] === FLIP_SOLID)) this.v[c] = 0;
      }
    }
  }

  // ---------------------------------------------------------------- particle density (for drift fix)
  _updateDensity(pos, n) {
    const { nx, ny, h, ox, oy, density } = this;
    const h1 = 1 / h, h2 = 0.5 * h;
    density.fill(0);
    for (let p = 0; p < n; p++) {
      let x = pos[2 * p] - ox, y = pos[2 * p + 1] - oy;
      x = x < h ? h : x > (nx - 1) * h ? (nx - 1) * h : x;
      y = y < h ? h : y > (ny - 1) * h ? (ny - 1) * h : y;
      const x0 = Math.floor((x - h2) * h1), tx = ((x - h2) - x0 * h) * h1, x1 = Math.min(x0 + 1, nx - 2);
      const y0 = Math.floor((y - h2) * h1), ty = ((y - h2) - y0 * h) * h1, y1 = Math.min(y0 + 1, ny - 2);
      const sx = 1 - tx, sy = 1 - ty;
      if (x0 < nx && y0 < ny) density[x0 * ny + y0] += sx * sy;
      if (x1 < nx && y0 < ny) density[x1 * ny + y0] += tx * sy;
      if (x1 < nx && y1 < ny) density[x1 * ny + y1] += tx * ty;
      if (x0 < nx && y1 < ny) density[x0 * ny + y1] += sx * ty;
    }
  }

  // ---------------------------------------------------------------- 2. pressure projection
  _project() {
    const { nx, ny, u, v, s, cellType, density, fluidList } = this;
    this.prevU.set(u); this.prevV.set(v);          // remember the pre-pressure field for the FLIP delta

    // only visit cells that actually contain water (huge saving when the tank is mostly empty)
    let count = 0;
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const c = i * ny + j;
        if (cellType[c] === FLIP_FLUID) fluidList[count++] = c;
      }
    }
    this.fluidCount = count;

    const rest = this.restDensity, k = this.driftK * this.h, over = this.overRelax;
    for (let iter = 0; iter < this.iterations; iter++) {
      for (let q = 0; q < count; q++) {
        const c = fluidList[q];
        const right = c + ny, top = c + 1;
        const sx0 = s[c - ny], sx1 = s[right], sy0 = s[c - 1], sy1 = s[top];
        const sum = sx0 + sx1 + sy0 + sy1;
        if (sum === 0) continue;
        let div = u[right] - u[c] + v[top] - v[c];
        if (rest > 0) {                              // too many particles here? ask for expansion
          const compression = density[c] - rest;
          if (compression > 0) div -= k * compression;
        }
        const p = (-div / sum) * over;
        u[c] -= sx0 * p; u[right] += sx1 * p;
        v[c] -= sy0 * p; v[top] += sy1 * p;
      }
    }
  }

  // ---------------------------------------------------------------- 3. grid -> particles
  _toParticles(pos, vel, n) {
    const { nx, ny, h, ox, oy, cellType } = this;
    const h1 = 1 / h, h2 = 0.5 * h;
    const flipRatio = this.flipRatio;

    for (let comp = 0; comp < 2; comp++) {
      const f = comp === 0 ? this.u : this.v;
      const prevF = comp === 0 ? this.prevU : this.prevV;
      const dx = comp === 0 ? 0 : h2;
      const dy = comp === 0 ? h2 : 0;
      const offset = comp === 0 ? ny : 1;           // the cell on the other side of this face
      for (let p = 0; p < n; p++) {
        let x = pos[2 * p] - ox, y = pos[2 * p + 1] - oy;
        x = x < h ? h : x > (nx - 1) * h ? (nx - 1) * h : x;
        y = y < h ? h : y > (ny - 1) * h ? (ny - 1) * h : y;
        const x0 = Math.min(Math.floor((x - dx) * h1), nx - 2);
        const tx = ((x - dx) - x0 * h) * h1;
        const x1 = Math.min(x0 + 1, nx - 2);
        const y0 = Math.min(Math.floor((y - dy) * h1), ny - 2);
        const ty = ((y - dy) - y0 * h) * h1;
        const y1 = Math.min(y0 + 1, ny - 2);
        const sx = 1 - tx, sy = 1 - ty;
        const n0 = x0 * ny + y0, n1 = x1 * ny + y0, n2 = x1 * ny + y1, n3 = x0 * ny + y1;
        // a face only counts if at least one of the two cells it separates holds water or a wall
        const v0 = (cellType[n0] !== FLIP_AIR || cellType[n0 - offset] !== FLIP_AIR) ? 1 : 0;
        const v1 = (cellType[n1] !== FLIP_AIR || cellType[n1 - offset] !== FLIP_AIR) ? 1 : 0;
        const v2 = (cellType[n2] !== FLIP_AIR || cellType[n2 - offset] !== FLIP_AIR) ? 1 : 0;
        const v3 = (cellType[n3] !== FLIP_AIR || cellType[n3 - offset] !== FLIP_AIR) ? 1 : 0;
        const w0 = v0 * sx * sy, w1 = v1 * tx * sy, w2 = v2 * tx * ty, w3 = v3 * sx * ty;
        const d = w0 + w1 + w2 + w3;
        if (d > 0) {
          const pic  = (w0 * f[n0] + w1 * f[n1] + w2 * f[n2] + w3 * f[n3]) / d;
          const corr = (w0 * (f[n0] - prevF[n0]) + w1 * (f[n1] - prevF[n1]) +
                        w2 * (f[n2] - prevF[n2]) + w3 * (f[n3] - prevF[n3])) / d;
          vel[2 * p + comp] = (1 - flipRatio) * pic + flipRatio * (vel[2 * p + comp] + corr);
        }
      }
    }
  }
}

// =====================================================================================
// Adapter for the sandbox's Obj/Verlet particles. Only touches globals inside functions,
// so this file can also be loaded in Node for testing the solver on its own.
// =====================================================================================
let flipFluid = null;
let flipPos = new Float32Array(0), flipVel = new Float32Array(0), flipIdx = new Int32Array(0);
let flipKey = "";

/** Same transform collline() uses, so the grid sees the line where the particles see it. */
function flipLineEnds(l) {
  let nx = 0, ny = 0;
  if (l.rail && l.rail.has && l.rail.kfs.length) {
    let rl = 0;
    l.rail.kfs.forEach((kf) => { rl += dist(kf.sp, kf.ep); });
    let td = l.rail.t / rl;
    if (td > 1) td = 2 - td;
    nx = (l.rail.kfs[0].ep.x - l.rail.kfs[0].sp.x) * td;
    ny = (l.rail.kfs[0].ep.y - l.rail.kfs[0].sp.y) * td;
  }
  const c = Math.cos(l.m.t), s = Math.sin(l.m.t);
  const ax = l.p1.x - l.m.p.x, ay = l.p1.y - l.m.p.y;
  const bx = l.p2.x - l.m.p.x, by = l.p2.y - l.m.p.y;
  return [
    ax * c - ay * s + l.m.p.x + nx, ax * s + ay * c + l.m.p.y + ny,
    bx * c - by * s + l.m.p.x + nx, bx * s + by * c + l.m.p.y + ny,
  ];
}

/**
 * Call once per physics tick, BEFORE the objs.forEach(obj => obj.phys()) loop.
 * Turns each liquid particle's implicit Verlet velocity (p - pp) plus pending forces (a) into a
 * pressure-corrected velocity, then re-encodes it as pp so phys() moves the particle by exactly that.
 */
function stepFlip(objs) {
  if (inf) return;                                   // no walls in infinite space -> no tank to simulate
  let n = 0, rSum = 0;
  if (flipIdx.length < objs.length) flipIdx = new Int32Array(objs.length * 2);
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (o.liquid && !o.f) { flipIdx[n++] = i; rSum += o.r; }
  }
  if (n === 0) return;

  const r = rSum / n;
  const W = innerHeight - 75, H = innerHeight - 75;  // same box collwall() uses
  const key = r.toFixed(2) + "|" + W;
  if (!flipFluid || key !== flipKey) {               // (re)build when particle size or window changes
    flipKey = key;
    flipFluid = new FlipFluid({ minX: 0, maxX: W, minY: -0.25 * H, maxY: H, particleRadius: r });
  }
  if (flipPos.length < n * 2) { flipPos = new Float32Array(n * 4); flipVel = new Float32Array(n * 4); }

  for (let k = 0; k < n; k++) {
    const o = objs[flipIdx[k]];
    flipPos[2 * k] = o.p.x;                  flipPos[2 * k + 1] = o.p.y;
    flipVel[2 * k] = o.p.x - o.pp.x + o.a.x; flipVel[2 * k + 1] = o.p.y - o.pp.y + o.a.y;
  }

  // solids: fixed balls and lines (cheap; rebuilt every tick so moving lines keep working)
  flipFluid.clearObstacles();
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (o.f && !o.liquid) flipFluid.addCircle(o.p.x, o.p.y, o.r);
  }
  for (const l of lines) {
    const e = flipLineEnds(l);
    flipFluid.addSegment(e[0], e[1], e[2], e[3], l.w / 2);
  }

  flipFluid.step(flipPos, flipVel, n);

  for (let k = 0; k < n; k++) {
    const o = objs[flipIdx[k]];
    o.pp = { x: o.p.x - flipVel[2 * k], y: o.p.y - flipVel[2 * k + 1] };
    o.a = { x: 0, y: 0 };                    // forces were folded into the velocity above
  }
}

if (typeof module !== "undefined") module.exports = { FlipFluid };