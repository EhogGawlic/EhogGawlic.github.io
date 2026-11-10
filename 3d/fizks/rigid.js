"use strict";
import { Obj2, Obj3 } from "./obj.js"
function resolvePointEdge(c, wc, a, b, wab, t, nx, ny, pen) {
    const s = 1 - t
    const W = wc + (s * s + t * t) * wab
    if (W <= 0) return
    const k = pen / W
    c.x += nx * k * wc
    c.y += ny * k * wc
    a.x -= nx * k * wab * s
    a.y -= ny * k * wab * s
    b.x -= nx * k * wab * t
    b.y -= ny * k * wab * t
}

// One convex piece of a body: owns the collision geometry, not the motion.
class Part2 {
    // pts: this part's particles, in the same order as verts (local coords, used for setup only)
    constructor(body, pts, verts) {
        this.body = body
        this.pts = pts

        // winding: +1 if the vertices run counter-clockwise in x-right/y-up axes
        let area2 = 0
        for (let i = 0; i < verts.length; i++) {
            const [x1, y1] = verts[i]
            const [x2, y2] = verts[(i + 1) % verts.length]
            area2 += x1 * y2 - x2 * y1
        }
        this.s = area2 >= 0 ? 1 : -1

        this.minX = this.minY = this.maxX = this.maxY = 0
        this.update()
    }

    clone(body, pointCopies) {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.body = body
        copy.pts = this.pts.map(point => pointCopies.get(point))
        copy.update()
        return copy
    }

    get f() { return this.body.f }

    update() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const q of this.pts) {
            if (q.p.x < minX) minX = q.p.x
            if (q.p.x > maxX) maxX = q.p.x
            if (q.p.y < minY) minY = q.p.y
            if (q.p.y > maxY) maxY = q.p.y
        }
        this.minX = minX; this.minY = minY; this.maxX = maxX; this.maxY = maxY
    }

    // ball (Obj2) vs this part. Position-only (PBD) response, so contacts are inelastic.
    collideBall(ball) {
        const r = ball.r
        const c = ball.p
        if (c.x < this.minX - r || c.x > this.maxX + r || c.y < this.minY - r || c.y > this.maxY + r) return
        if (ball.f && this.f) return

        const pts = this.pts, n = pts.length
        let bestD2 = Infinity, bi = -1, bt = 0, bdx = 0, bdy = 0
        let inside = true
        for (let i = 0; i < n; i++) {
            const A = pts[i].p, B = pts[(i + 1) % n].p
            const ex = B.x - A.x, ey = B.y - A.y
            const len2 = ex * ex + ey * ey
            let t = ((c.x - A.x) * ex + (c.y - A.y) * ey) / len2
            t = t < 0 ? 0 : t > 1 ? 1 : t
            const dx = c.x - (A.x + ex * t)
            const dy = c.y - (A.y + ey * t)
            const d2 = dx * dx + dy * dy
            if (d2 < bestD2) { bestD2 = d2; bi = i; bt = t; bdx = dx; bdy = dy }
            // outward normal of this edge is s * (ey, -ex); the centre is outside if it's on that side
            if (this.s * ((c.x - A.x) * ey - (c.y - A.y) * ex) > 0) inside = false
        }

        const d = Math.sqrt(bestD2)
        if (!inside && d >= r) return

        const A = pts[bi], B = pts[(bi + 1) % n]
        let nx, ny, pen
        if (inside) {
            // centre is inside the shape: leave through the nearest edge
            const ex = B.p.x - A.p.x, ey = B.p.y - A.p.y
            const l = Math.hypot(ex, ey)
            nx = this.s * ey / l
            ny = -this.s * ex / l
            pen = d + r
        } else {
            nx = bdx / d
            ny = bdy / d
            pen = r - d
        }

        const wc = ball.f ? 0 : 1 / ball.m
        const wab = this.f ? 0 : 1 / A.m
        resolvePointEdge(c, wc, A.p, B.p, wab, bt, nx, ny, pen)
    }
    static collide(A, B) {
        if (A.f && B.f) return
        if (A.maxX < B.minX || B.maxX < A.minX || A.maxY < B.minY || B.maxY < A.minY) return

        let best = null, minOverlap = Infinity
        for (let side = 0; side < 2; side++) {
            const P = side === 0 ? A : B
            const Q = side === 0 ? B : A
            const n = P.pts.length
            for (let i = 0; i < n; i++) {
                const a = P.pts[i].p, b = P.pts[(i + 1) % n].p
                const ex = b.x - a.x, ey = b.y - a.y
                const l = Math.hypot(ex, ey)
                const nx = P.s * ey / l
                const ny = -P.s * ex / l
                const edgeOff = nx * a.x + ny * a.y

                let minProj = Infinity, vi = -1
                for (let j = 0; j < Q.pts.length; j++) {
                    const q = Q.pts[j].p
                    const pr = nx * q.x + ny * q.y
                    if (pr < minProj) { minProj = pr; vi = j }
                }
                const overlap = edgeOff - minProj
                if (overlap <= 0) return          // found a separating axis
                if (overlap < minOverlap) {
                    minOverlap = overlap
                    best = { P, Q, i, vi, nx, ny }
                }
            }
        }
        if (!best) return

        const { P, Q, i, vi, nx, ny } = best
        const PA = P.pts[i], PB = P.pts[(i + 1) % P.pts.length]
        const ex = PB.p.x - PA.p.x, ey = PB.p.y - PA.p.y
        const len2 = ex * ex + ey * ey
        const off = nx * PA.p.x + ny * PA.p.y
        const wq = Q.f ? 0 : 1 / Q.pts[0].m
        const wab = P.f ? 0 : 1 / PA.m
        let accA = 0, accB = 0, count = 0
        for (const vert of Q.pts) {
            const q = vert.p
            const pen = off - (nx * q.x + ny * q.y)
            if (pen <= 0) continue
            const t = ((q.x - PA.p.x) * ex + (q.y - PA.p.y) * ey) / len2
            if (t < -0.03 || t > 1.03) continue
            resolveContact(q, wq, wab, t < 0 ? 0 : t > 1 ? 1 : t, nx, ny, pen)
            count++
        }
        if (count === 0) {
            // no vertex lies along the edge: fall back to the deepest one with the contact point clamped to the edge
            const V = Q.pts[vi]
            let t = ((V.p.x - PA.p.x) * ex + (V.p.y - PA.p.y) * ey) / len2
            t = t < 0 ? 0 : t > 1 ? 1 : t
            resolveContact(V.p, wq, wab, t, nx, ny, minOverlap)
        }
        PA.p.x -= nx * accA; PA.p.y -= ny * accA
        PB.p.x -= nx * accB; PB.p.y -= ny * accB

        function resolveContact(q, wc, wab, t, nx, ny, pen) {
            const sA = 1 - t
            const W = wc + (sA * sA + t * t) * wab
            if (W <= 0) return
            const k = pen / W
            q.x += nx * k * wc
            q.y += ny * k * wc
            accA += k * wab * sA
            accB += k * wab * t
        }
    }
}

function boxVerts(w, h, ox, oy, angle) {
    const hw = w / 2, hh = h / 2
    const c = Math.cos(angle), s = Math.sin(angle)
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [ox + x * c - y * s, oy + x * s + y * c])
}

function polygonArea(verts) {
    let a = 0
    for (let i = 0; i < verts.length; i++) {
        const [x1, y1] = verts[i]
        const [x2, y2] = verts[(i + 1) % verts.length]
        a += x1 * y2 - x2 * y1
    }
    return Math.abs(a) / 2
}

export class Rigid2 {
    constructor(options) {
        const cx = options.x ?? 0, cy = options.y ?? 0
        const ang = options.angle ?? 0
        const spin = options.spin ?? 0
        const vx = options.vx ?? 0, vy = options.vy ?? 0
        const cos = Math.cos(ang), sin = Math.sin(ang)

        const specs = (options.parts ?? [{ verts: options.verts }]).map(sp =>
            sp.verts ? sp : {
                verts: boxVerts(sp.w ?? 40, sp.h ?? 40, sp.x ?? 0, sp.y ?? 0, sp.angle ?? 0),
                weight: sp.weight,
            })

        this.f = options.fixed ?? false
        this.color = options.color ?? "#ff8844"
        this.stiffness = options.stiffness ?? 1    // 1 = perfectly rigid, lower = squishy

        const totalMass = options.mass ?? 40
        let weights = specs.map(sp => sp.weight ?? polygonArea(sp.verts))
        let wsum = weights.reduce((a, b) => a + b, 0)
        if (!(wsum > 0)) { weights = specs.map(() => 1); wsum = specs.length }

        this.pts = []
        this.parts = []
        specs.forEach((sp, si) => {
            const pm = totalMass * weights[si] / wsum / sp.verts.length
            const pts = sp.verts.map(([lx, ly]) => new Obj2({
                x: cx + lx * cos - ly * sin,
                y: cy + lx * sin + ly * cos,
                vx, vy,
                rad: 0,
                bounce: options.bounce ?? 0,
                fixed: this.f,
                mass: pm,
            }))
            this.pts.push(...pts)
            this.parts.push(new Part2(this, pts, sp.verts))
        })

        this.resetRest()

        if (spin !== 0) {
            // spin about the centre of mass: add w x r to every particle's velocity
            const com = this.com()
            for (const q of this.pts) {
                q.pp.x += spin * (q.p.y - com.y)
                q.pp.y -= spin * (q.p.x - com.x)
            }
        }
        this.update()
    }

    static box(options) {
        return new Rigid2({ ...options, parts: [{ w: options.w ?? 40, h: options.h ?? 40 }] })
    }

    clone() {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.pts = this.pts.map(point => point.clone())
        const pointCopies = new Map(this.pts.map((point, index) => [point, copy.pts[index]]))
        copy.parts = this.parts.map(part => part.clone(copy, pointCopies))
        copy.rest = this.rest.map(point => point.slice())
        copy.update()
        return copy
    }

    com() {
        let m = 0, x = 0, y = 0
        for (const q of this.pts) { m += q.m; x += q.m * q.p.x; y += q.m * q.p.y }
        return { x: x / m, y: y / m }
    }

    resetRest() {
        const pts = this.pts
        let m = 0, x = 0, y = 0
        for (const q of pts) { m += q.m; x += q.m * q.p.x; y += q.m * q.p.y }
        x /= m; y /= m
        this.mtot = m
        this.rest = pts.map(q => [q.p.x - x, q.p.y - y])
    }

    weld(other) {
        if (other === this) return this
        for (const part of other.parts) { part.body = this; this.parts.push(part) }
        this.pts = this.pts.concat(other.pts)
        other.parts = []
        other.pts = []
        this.f = this.f || other.f
        for (const q of this.pts) q.f = this.f
        this.resetRest()
        this.update()
        return this
    }

    get f() { return this._f }
    set f(v) {
        if (v === this._f) return
        this._f = v
        if (!this.pts) return          // called from the constructor, before the particles exist
        for (const q of this.pts) {
            q.f = v
            q.pp.x = q.p.x; q.pp.y = q.p.y        // no leftover velocity when switching
        }
    }

    get center() { return this.com() }

    // bounding box of the whole body, and each part's own bounds
    update() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const part of this.parts) {
            part.update()
            if (part.minX < minX) minX = part.minX
            if (part.minY < minY) minY = part.minY
            if (part.maxX > maxX) maxX = part.maxX
            if (part.maxY > maxY) maxY = part.maxY
        }
        this.minX = minX; this.minY = minY; this.maxX = maxX; this.maxY = maxY
    }

    integrate(gravity) {
        for (const q of this.pts) q.integrate(gravity)   // Obj2.integrate skips fixed particles
    }

    collideWalls(type, ...walls) {
        if (this.f) return
        for (const q of this.pts) q.collideWalls(type, ...walls)
    }
    solveConstraints() {
        if (this.f) return
        const pts = this.pts, rest = this.rest, n = pts.length
        let cx = 0, cy = 0
        for (let i = 0; i < n; i++) { cx += pts[i].m * pts[i].p.x; cy += pts[i].m * pts[i].p.y }
        cx /= this.mtot; cy /= this.mtot

        let dot = 0, cross = 0
        for (let i = 0; i < n; i++) {
            const m = pts[i].m
            const px = pts[i].p.x - cx, py = pts[i].p.y - cy
            dot += m * (rest[i][0] * px + rest[i][1] * py)
            cross += m * (rest[i][0] * py - rest[i][1] * px)
        }
        const ang = Math.atan2(cross, dot)
        const c = Math.cos(ang), s = Math.sin(ang)
        const k = this.stiffness
        for (let i = 0; i < n; i++) {
            const p = pts[i].p
            const gx = cx + rest[i][0] * c - rest[i][1] * s
            const gy = cy + rest[i][0] * s + rest[i][1] * c
            p.x += (gx - p.x) * k
            p.y += (gy - p.y) * k
        }
    }

    // ball (Obj2) vs every part of this body
    collideBall(ball) {
        const r = ball.r, c = ball.p
        if (c.x < this.minX - r || c.x > this.maxX + r || c.y < this.minY - r || c.y > this.maxY + r) return
        for (const part of this.parts) part.collideBall(ball)
    }

    // this body vs another: every part against every part (parts of one body never collide)
    collideBody(other) {
        if (this.f && other.f) return
        if (this.maxX < other.minX || other.maxX < this.minX || this.maxY < other.minY || other.maxY < this.minY) return
        for (const a of this.parts) {
            for (const b of other.parts) Part2.collide(a, b)
        }
    }
}
const _n = { x: 0, y: 0, z: 0, d: 0 }
const _cp = { x: 0, y: 0, z: 0, u: 0, v: 0, w: 0 }
const _tri = { ia: 0, ib: 0, ic: 0, u: 0, v: 0, w: 0, d2: 0 }
const _ss = { s: 0, t: 0 }
const _acc = new Float64Array(64)

function setCP(out, x, y, z, u, v, w) {
    out.x = x; out.y = y; out.z = z; out.u = u; out.v = v; out.w = w
    return out
}

// closest point on triangle abc to p, plus barycentric weights (u for a, v for b, w for c)
function closestPointTriangle(px, py, pz, a, b, c, out) {
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z
    const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z
    const apx = px - a.x, apy = py - a.y, apz = pz - a.z
    const d1 = abx * apx + aby * apy + abz * apz
    const d2 = acx * apx + acy * apy + acz * apz
    if (d1 <= 0 && d2 <= 0) return setCP(out, a.x, a.y, a.z, 1, 0, 0)

    const bpx = px - b.x, bpy = py - b.y, bpz = pz - b.z
    const d3 = abx * bpx + aby * bpy + abz * bpz
    const d4 = acx * bpx + acy * bpy + acz * bpz
    if (d3 >= 0 && d4 <= d3) return setCP(out, b.x, b.y, b.z, 0, 1, 0)

    const vc = d1 * d4 - d3 * d2
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3)
        return setCP(out, a.x + abx * v, a.y + aby * v, a.z + abz * v, 1 - v, v, 0)
    }

    const cpx = px - c.x, cpy = py - c.y, cpz = pz - c.z
    const d5 = abx * cpx + aby * cpy + abz * cpz
    const d6 = acx * cpx + acy * cpy + acz * cpz
    if (d6 >= 0 && d5 <= d6) return setCP(out, c.x, c.y, c.z, 0, 0, 1)

    const vb = d5 * d2 - d1 * d6
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6)
        return setCP(out, a.x + acx * w, a.y + acy * w, a.z + acz * w, 1 - w, 0, w)
    }

    const va = d3 * d6 - d5 * d4
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6))
        return setCP(out, b.x + (c.x - b.x) * w, b.y + (c.y - b.y) * w, b.z + (c.z - b.z) * w, 0, 1 - w, w)
    }

    const denom = 1 / (va + vb + vc)
    const v = vb * denom, w = vc * denom
    return setCP(out, a.x + abx * v + acx * w, a.y + aby * v + acy * w, a.z + abz * v + acz * w, 1 - v - w, v, w)
}

// closest points between segments p1-q1 and p2-q2, as parameters out.s and out.t (0..1)
function closestSegSeg(p1, q1, p2, q2, out) {
    const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d1z = q1.z - p1.z
    const d2x = q2.x - p2.x, d2y = q2.y - p2.y, d2z = q2.z - p2.z
    const rx = p1.x - p2.x, ry = p1.y - p2.y, rz = p1.z - p2.z
    const a = d1x * d1x + d1y * d1y + d1z * d1z
    const e = d2x * d2x + d2y * d2y + d2z * d2z
    const f = d2x * rx + d2y * ry + d2z * rz
    const EPS = 1e-12
    let s = 0, t = 0
    if (a <= EPS && e <= EPS) {
        s = 0; t = 0
    } else if (a <= EPS) {
        t = Math.min(1, Math.max(0, f / e))
    } else {
        const c = d1x * rx + d1y * ry + d1z * rz
        if (e <= EPS) {
            s = Math.min(1, Math.max(0, -c / a))
        } else {
            const b = d1x * d2x + d1y * d2y + d1z * d2z
            const denom = a * e - b * b
            s = denom > EPS ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0
            t = (b * s + f) / e
            if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)) }
            else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)) }
        }
    }
    out.s = s; out.t = t
}

// outward unit normal and plane offset of face fi, from the current vertex positions
function faceNormal(body, fi, out) {
    const f = body.faces[fi], P = body.pts
    const a = P[f[0]].p, b = P[f[1]].p, c = P[f[2]].p
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z
    const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    out.x = nx / l; out.y = ny / l; out.z = nz / l
    out.d = out.x * a.x + out.y * a.y + out.z * a.z
}

// which triangle of face fi (fan from vertex 0) is nearest to q, and the weights there
function faceBary(body, fi, qx, qy, qz, out) {
    const f = body.faces[fi], P = body.pts
    let best = Infinity
    for (let k = 1; k < f.length - 1; k++) {
        closestPointTriangle(qx, qy, qz, P[f[0]].p, P[f[k]].p, P[f[k + 1]].p, _cp)
        const dx = qx - _cp.x, dy = qy - _cp.y, dz = qz - _cp.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < best) {
            best = d2
            out.ia = f[0]; out.ib = f[k]; out.ic = f[k + 1]
            out.u = _cp.u; out.v = _cp.v; out.w = _cp.w
        }
    }
    out.d2 = best
}

function resolvePointTri(c, wc, a, b, d, wp, u, v, w, nx, ny, nz, pen) {
    const W = wc + wp * (u * u + v * v + w * w)
    if (W <= 0) return
    const k = pen / W
    c.x += nx * k * wc; c.y += ny * k * wc; c.z += nz * k * wc
    const ku = k * wp * u, kv = k * wp * v, kw = k * wp * w
    a.x -= nx * ku; a.y -= ny * ku; a.z -= nz * ku
    b.x -= nx * kv; b.y -= ny * kv; b.z -= nz * kv
    d.x -= nx * kw; d.y -= ny * kw; d.z -= nz * kw
}
function extractRotation(A, q) {
    for (let it = 0; it < 20; it++) {
        const w = q.w, x = q.x, y = q.y, z = q.z
        // columns of the rotation matrix for q
        const r00 = 1 - 2 * (y * y + z * z), r10 = 2 * (x * y + w * z), r20 = 2 * (x * z - w * y)
        const r01 = 2 * (x * y - w * z), r11 = 1 - 2 * (x * x + z * z), r21 = 2 * (y * z + w * x)
        const r02 = 2 * (x * z + w * y), r12 = 2 * (y * z - w * x), r22 = 1 - 2 * (x * x + y * y)
        // columns of A
        const a00 = A[0], a01 = A[1], a02 = A[2]
        const a10 = A[3], a11 = A[4], a12 = A[5]
        const a20 = A[6], a21 = A[7], a22 = A[8]
        const ox = (r10 * a20 - r20 * a10) + (r11 * a21 - r21 * a11) + (r12 * a22 - r22 * a12)
        const oy = (r20 * a00 - r00 * a20) + (r21 * a01 - r01 * a21) + (r22 * a02 - r02 * a22)
        const oz = (r00 * a10 - r10 * a00) + (r01 * a11 - r11 * a01) + (r02 * a12 - r12 * a02)
        const den = Math.abs(r00 * a00 + r10 * a10 + r20 * a20 +
                             r01 * a01 + r11 * a11 + r21 * a21 +
                             r02 * a02 + r12 * a12 + r22 * a22) + 1e-9
        const px = ox / den, py = oy / den, pz = oz / den
        const mag = Math.sqrt(px * px + py * py + pz * pz)
        if (mag < 1e-9) break
        const sh = Math.sin(mag / 2) / mag, ch = Math.cos(mag / 2)
        const dx = px * sh, dy = py * sh, dz = pz * sh
        // q = dq * q
        const nw = ch * w - dx * x - dy * y - dz * z
        const nx = ch * x + dx * w + dy * z - dz * y
        const ny = ch * y - dx * z + dy * w + dz * x
        const nz = ch * z + dx * y - dy * x + dz * w
        const inv = 1 / Math.sqrt(nw * nw + nx * nx + ny * ny + nz * nz)
        q.w = nw * inv; q.x = nx * inv; q.y = ny * inv; q.z = nz * inv
    }
}

function rotate(x, y, z, ax, ay, az) {
    let c = Math.cos(ax), s = Math.sin(ax)
    let y1 = y * c - z * s, z1 = y * s + z * c
    y = y1; z = z1
    c = Math.cos(ay); s = Math.sin(ay)
    let x1 = x * c + z * s
    z1 = -x * s + z * c
    x = x1; z = z1
    c = Math.cos(az); s = Math.sin(az)
    x1 = x * c - y * s
    y1 = x * s + y * c
    return [x1, y1, z]
}

// One convex piece of a body: owns the collision geometry, not the motion.
class Part3 {
    // pts: this part's particles, in the same order as verts (local coords, used for setup only)
    constructor(body, pts, verts, faces) {
        this.body = body
        this.pts = pts

        // make every face wind so its normal (b-a)x(c-a) points away from the part's centre
        let mx = 0, my = 0, mz = 0
        for (const [x, y, z] of verts) { mx += x; my += y; mz += z }
        mx /= verts.length; my /= verts.length; mz /= verts.length
        this.faces = faces.map(face => {
            const f = face.slice()
            const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]]
            const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
            const wx2 = c[0] - a[0], wy2 = c[1] - a[1], wz2 = c[2] - a[2]
            const nx = uy * wz2 - uz * wy2, ny = uz * wx2 - ux * wz2, nz = ux * wy2 - uy * wx2
            let fx = 0, fy = 0, fz = 0
            for (const i of f) { fx += verts[i][0]; fy += verts[i][1]; fz += verts[i][2] }
            fx = fx / f.length - mx; fy = fy / f.length - my; fz = fz / f.length - mz
            if (nx * fx + ny * fy + nz * fz < 0) f.reverse()
            return f
        })

        // unique edges, grouped into sets of parallel edges (a box has 3 sets of 4)
        const seen = new Set()
        const edges = []
        for (const f of this.faces) {
            for (let i = 0; i < f.length; i++) {
                const a = f[i], b = f[(i + 1) % f.length]
                const key = a < b ? a + "_" + b : b + "_" + a
                if (!seen.has(key)) { seen.add(key); edges.push([a, b]) }
            }
        }
        this.edgeSets = []
        const setDirs = []
        for (const [a, b] of edges) {
            let dx = verts[b][0] - verts[a][0], dy = verts[b][1] - verts[a][1], dz = verts[b][2] - verts[a][2]
            const l = Math.hypot(dx, dy, dz)
            dx /= l; dy /= l; dz /= l
            let k = setDirs.findIndex(d => Math.abs(d[0] * dx + d[1] * dy + d[2] * dz) > 1 - 1e-6)
            if (k < 0) { setDirs.push([dx, dy, dz]); this.edgeSets.push([]); k = setDirs.length - 1 }
            this.edgeSets[k].push([a, b])
        }

        let rad = 0
        for (const [x, y, z] of verts) rad = Math.max(rad, Math.hypot(x - mx, y - my, z - mz))
        this.tol2 = (0.03 * rad) ** 2     // how far outside a face a vertex may land and still count as touching it

        this.minX = this.minY = this.minZ = this.maxX = this.maxY = this.maxZ = 0
        this.cx = this.cy = this.cz = 0
        this.update()
    }

    clone(body, pointCopies) {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.body = body
        copy.pts = this.pts.map(point => pointCopies.get(point))
        copy.faces = this.faces.map(face => face.slice())
        copy.edgeSets = this.edgeSets.map(set => set.map(edge => edge.slice()))
        copy.update()
        return copy
    }

    get f() { return this.body.f }

    // bounding box and centre, from the current positions
    update() {
        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
        let sx = 0, sy = 0, sz = 0
        for (const q of this.pts) {
            const p = q.p
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
            if (p.z < minZ) minZ = p.z
            if (p.z > maxZ) maxZ = p.z
            sx += p.x; sy += p.y; sz += p.z
        }
        this.minX = minX; this.minY = minY; this.minZ = minZ
        this.maxX = maxX; this.maxY = maxY; this.maxZ = maxZ
        const n = this.pts.length
        this.cx = sx / n; this.cy = sy / n; this.cz = sz / n
    }

    // ball (Obj3) vs this part. Position-only response, so contacts are inelastic.
    collideBall(ball) {
        const r = ball.r
        const c = ball.p
        if (c.x < this.minX - r || c.x > this.maxX + r ||
            c.y < this.minY - r || c.y > this.maxY + r ||
            c.z < this.minZ - r || c.z > this.maxZ + r) return
        if (ball.f && this.f) return

        const faces = this.faces, pts = this.pts

        // plane test: if the centre is further than r outside any face plane, there's no contact
        let inFace = -1, inD = -Infinity, inx = 0, iny = 0, inz = 0
        for (let fi = 0; fi < faces.length; fi++) {
            faceNormal(this, fi, _n)
            const d = _n.x * c.x + _n.y * c.y + _n.z * c.z - _n.d
            if (d > r) return
            if (d > inD) { inD = d; inFace = fi; inx = _n.x; iny = _n.y; inz = _n.z }
        }

        let nx, ny, nz, pen
        if (inD <= 0) {
            // centre is inside the body: leave through the nearest face
            nx = inx; ny = iny; nz = inz
            pen = r - inD
            faceBary(this, inFace, c.x - inD * nx, c.y - inD * ny, c.z - inD * nz, _tri)
        } else {
            // centre is outside: find the nearest point on the surface
            let best = Infinity, bdx = 0, bdy = 0, bdz = 0
            for (let fi = 0; fi < faces.length; fi++) {
                const f = faces[fi]
                for (let k = 1; k < f.length - 1; k++) {
                    closestPointTriangle(c.x, c.y, c.z, pts[f[0]].p, pts[f[k]].p, pts[f[k + 1]].p, _cp)
                    const dx = c.x - _cp.x, dy = c.y - _cp.y, dz = c.z - _cp.z
                    const d2 = dx * dx + dy * dy + dz * dz
                    if (d2 < best) {
                        best = d2; bdx = dx; bdy = dy; bdz = dz
                        _tri.ia = f[0]; _tri.ib = f[k]; _tri.ic = f[k + 1]
                        _tri.u = _cp.u; _tri.v = _cp.v; _tri.w = _cp.w
                    }
                }
            }
            const d = Math.sqrt(best)
            if (d >= r) return
            nx = bdx / d; ny = bdy / d; nz = bdz / d
            pen = r - d
        }

        const wc = ball.f ? 0 : 1 / ball.m
        const wp = this.f ? 0 : 1 / pts[0].m
        resolvePointTri(c, wc, pts[_tri.ia].p, pts[_tri.ib].p, pts[_tri.ic].p, wp,
            _tri.u, _tri.v, _tri.w, nx, ny, nz, pen)
    }

    static collide(A, B) {
        if (A.f && B.f) return
        if (A.maxX < B.minX || B.maxX < A.minX ||
            A.maxY < B.minY || B.maxY < A.minY ||
            A.maxZ < B.minZ || B.maxZ < A.minZ) return

        // face axes
        let fOv = Infinity, fP = null, fQ = null, fFi = -1
        for (let side = 0; side < 2; side++) {
            const P = side === 0 ? A : B
            const Q = side === 0 ? B : A
            for (let fi = 0; fi < P.faces.length; fi++) {
                faceNormal(P, fi, _n)
                let minProj = Infinity
                for (const q of Q.pts) {
                    const pr = _n.x * q.p.x + _n.y * q.p.y + _n.z * q.p.z
                    if (pr < minProj) minProj = pr
                }
                const ov = _n.d - minProj
                if (ov <= 0) return                 // found a separating axis
                if (ov < fOv) { fOv = ov; fP = P; fQ = Q; fFi = fi }
            }
        }

        // edge axes (skipping parallel pairs, whose cross product is ~0)
        let eOv = Infinity, enx = 0, eny = 0, enz = 0, eSetA = -1, eSetB = -1
        const dcx = B.cx - A.cx, dcy = B.cy - A.cy, dcz = B.cz - A.cz
        for (let ka = 0; ka < A.edgeSets.length; ka++) {
            const ea = A.edgeSets[ka][0]
            const a0 = A.pts[ea[0]].p, a1 = A.pts[ea[1]].p
            const dax = a1.x - a0.x, day = a1.y - a0.y, daz = a1.z - a0.z
            const la = Math.sqrt(dax * dax + day * day + daz * daz)
            for (let kb = 0; kb < B.edgeSets.length; kb++) {
                const eb = B.edgeSets[kb][0]
                const b0 = B.pts[eb[0]].p, b1 = B.pts[eb[1]].p
                const dbx = b1.x - b0.x, dby = b1.y - b0.y, dbz = b1.z - b0.z
                const lb = Math.sqrt(dbx * dbx + dby * dby + dbz * dbz)
                let nx = day * dbz - daz * dby
                let ny = daz * dbx - dax * dbz
                let nz = dax * dby - day * dbx
                const l = Math.sqrt(nx * nx + ny * ny + nz * nz)
                if (l < 1e-4 * la * lb) continue
                nx /= l; ny /= l; nz /= l
                if (nx * dcx + ny * dcy + nz * dcz < 0) { nx = -nx; ny = -ny; nz = -nz }   // point from A towards B

                let maxA = -Infinity, minB = Infinity
                for (const q of A.pts) {
                    const pr = nx * q.p.x + ny * q.p.y + nz * q.p.z
                    if (pr > maxA) maxA = pr
                }
                for (const q of B.pts) {
                    const pr = nx * q.p.x + ny * q.p.y + nz * q.p.z
                    if (pr < minB) minB = pr
                }
                const ov = maxA - minB
                if (ov <= 0) return                 // separating axis
                if (ov < eOv) { eOv = ov; enx = nx; eny = ny; enz = nz; eSetA = ka; eSetB = kb }
            }
        }

        // prefer a face contact unless an edge axis is clearly shallower
        if (eSetA >= 0 && eOv < fOv * 0.95) {
            Part3.resolveEdges(A, B, eSetA, eSetB, enx, eny, enz, eOv)
        } else if (Part3.resolveFace(fP, fFi, fQ) === 0 && eSetA >= 0) {
            Part3.resolveEdges(A, B, eSetA, eSetB, enx, eny, enz, eOv)
        }
    }
    static resolveFace(P, fi, Q) {
        let count = 0
        const wp = P.f ? 0 : 1 / P.pts[0].m
        const wq = Q.f ? 0 : 1 / Q.pts[0].m
        const face = P.faces[fi]
        const nf = face.length
        const quad = nf === 4

        faceNormal(P, fi, _n)
        const nx = _n.x, ny = _n.y, nz = _n.z
        const o = P.pts[face[0]].p
        const off = nx * o.x + ny * o.y + nz * o.z
        const acc = _acc
        for (let i = 0; i < nf; i++) acc[i] = 0      // total push along -n for each face corner

        for (const vert of Q.pts) {
            const q = vert.p
            const pen = off - (nx * q.x + ny * q.y + nz * q.z)
            if (pen <= 0) continue
            const qx = q.x + nx * pen, qy = q.y + ny * pen, qz = q.z + nz * pen

            if (quad) {
                const p0 = P.pts[face[0]].p, p1 = P.pts[face[1]].p, p3 = P.pts[face[3]].p
                const e1x = p1.x - p0.x, e1y = p1.y - p0.y, e1z = p1.z - p0.z
                const e2x = p3.x - p0.x, e2y = p3.y - p0.y, e2z = p3.z - p0.z
                const rx = qx - p0.x, ry = qy - p0.y, rz = qz - p0.z
                const g11 = e1x * e1x + e1y * e1y + e1z * e1z
                const g12 = e1x * e2x + e1y * e2y + e1z * e2z
                const g22 = e2x * e2x + e2y * e2y + e2z * e2z
                const b1 = rx * e1x + ry * e1y + rz * e1z
                const b2 = rx * e2x + ry * e2y + rz * e2z
                const det = g11 * g22 - g12 * g12
                if (det < 1e-12) continue
                let s = (b1 * g22 - b2 * g12) / det
                let t = (b2 * g11 - b1 * g12) / det
                const tol = 0.03
                if (s < -tol || s > 1 + tol || t < -tol || t > 1 + tol) continue
                s = s < 0 ? 0 : s > 1 ? 1 : s
                t = t < 0 ? 0 : t > 1 ? 1 : t
                const w0 = (1 - s) * (1 - t), w1 = s * (1 - t), w2 = s * t, w3 = (1 - s) * t
                const W = wq + wp * (w0 * w0 + w1 * w1 + w2 * w2 + w3 * w3)
                if (W <= 0) continue
                const k = pen / W
                q.x += nx * k * wq; q.y += ny * k * wq; q.z += nz * k * wq
                acc[0] += k * wp * w0; acc[1] += k * wp * w1; acc[2] += k * wp * w2; acc[3] += k * wp * w3
            } else {
                faceBary(P, fi, qx, qy, qz, _tri)
                if (_tri.d2 > P.tol2) continue            // sank under the plane but outside the face
                const W = wq + wp * (_tri.u * _tri.u + _tri.v * _tri.v + _tri.w * _tri.w)
                if (W <= 0) continue
                const k = pen / W
                q.x += nx * k * wq; q.y += ny * k * wq; q.z += nz * k * wq
                // faceBary reports vertex ids; find their slot in the face
                acc[face.indexOf(_tri.ia)] += k * wp * _tri.u
                acc[face.indexOf(_tri.ib)] += k * wp * _tri.v
                acc[face.indexOf(_tri.ic)] += k * wp * _tri.w
            }
            count++
        }
        if (count > 0) {
            for (let i = 0; i < nf; i++) {
                const p = P.pts[face[i]].p, g = acc[i]
                p.x -= nx * g; p.y -= ny * g; p.z -= nz * g
            }
        }
        return count
    }

    // edge-edge contact: n points from A towards B
    static resolveEdges(A, B, setA, setB, nx, ny, nz, pen) {
        const ea = Part3.supportEdge(A, setA, nx, ny, nz, 1)
        const eb = Part3.supportEdge(B, setB, nx, ny, nz, -1)
        const a0 = A.pts[ea[0]].p, a1 = A.pts[ea[1]].p
        const b0 = B.pts[eb[0]].p, b1 = B.pts[eb[1]].p
        closestSegSeg(a0, a1, b0, b1, _ss)
        const s = _ss.s, t = _ss.t
        const wa = A.f ? 0 : 1 / A.pts[0].m
        const wb = B.f ? 0 : 1 / B.pts[0].m
        const sa = 1 - s, tb = 1 - t
        const W = wa * (sa * sa + s * s) + wb * (tb * tb + t * t)
        if (W <= 0) return
        const k = pen / W
        let g = k * wa * sa
        a0.x -= nx * g; a0.y -= ny * g; a0.z -= nz * g
        g = k * wa * s
        a1.x -= nx * g; a1.y -= ny * g; a1.z -= nz * g
        g = k * wb * tb
        b0.x += nx * g; b0.y += ny * g; b0.z += nz * g
        g = k * wb * t
        b1.x += nx * g; b1.y += ny * g; b1.z += nz * g
    }

    // among the parallel edges of one set, the one furthest along (sign = 1) or against (-1) n
    static supportEdge(body, setIdx, nx, ny, nz, sign) {
        let best = -Infinity, bestEdge = body.edgeSets[setIdx][0]
        for (const e of body.edgeSets[setIdx]) {
            const p = body.pts[e[0]].p, q = body.pts[e[1]].p
            const val = sign * (nx * (p.x + q.x) + ny * (p.y + q.y) + nz * (p.z + q.z))
            if (val > best) { best = val; bestEdge = e }
        }
        return bestEdge
    }
}

// ---------- shapes ----------

const BOX_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]]

// the 8 corners of a w*h*d box centred at (ox, oy, oz), rotated by ax, ay, az about its own centre
function boxGeometry(w, h, d, ox, oy, oz, ax, ay, az) {
    const hw = w / 2, hh = h / 2, hd = d / 2
    const local = [
        [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
        [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
    ]
    return {
        verts: local.map(([x, y, z]) => {
            const [rx, ry, rz] = rotate(x, y, z, ax, ay, az)
            return [ox + rx, oy + ry, oz + rz]
        }),
        faces: BOX_FACES,
    }
}

// volume of a convex polyhedron: tetrahedra from the vertex centroid to each face triangle
function polyhedronVolume(verts, faces) {
    let cx = 0, cy = 0, cz = 0
    for (const v of verts) { cx += v[0]; cy += v[1]; cz += v[2] }
    cx /= verts.length; cy /= verts.length; cz /= verts.length
    let vol = 0
    for (const f of faces) {
        for (let k = 1; k < f.length - 1; k++) {
            const a = verts[f[0]], b = verts[f[k]], c = verts[f[k + 1]]
            const ax = a[0] - cx, ay = a[1] - cy, az = a[2] - cz
            const bx = b[0] - cx, by = b[1] - cy, bz = b[2] - cz
            const dx = c[0] - cx, dy = c[1] - cy, dz = c[2] - cz
            vol += Math.abs(ax * (by * dz - bz * dy) + ay * (bz * dx - bx * dz) + az * (bx * dy - by * dx)) / 6
        }
    }
    return vol
}

export class Rigid3 {
    constructor(options) {
        const cx = options.x ?? 0, cy = options.y ?? 0, cz = options.z ?? 0
        const ax = options.ax ?? 0, ay = options.ay ?? 0, az = options.az ?? 0
        const vx = options.vx ?? 0, vy = options.vy ?? 0, vz = options.vz ?? 0
        const wx = options.spinx ?? 0, wy = options.spiny ?? 0, wz = options.spinz ?? 0

        const specs = (options.parts ?? [{ verts: options.verts, faces: options.faces }]).map(sp =>
            sp.verts ? sp : {
                ...boxGeometry(sp.w ?? 40, sp.h ?? 40, sp.d ?? 40, sp.x ?? 0, sp.y ?? 0, sp.z ?? 0,
                    sp.ax ?? 0, sp.ay ?? 0, sp.az ?? 0),
                weight: sp.weight,
            })

        this.f = options.fixed ?? false
        this.color = options.color ?? "#ff8844"
        this.stiffness = options.stiffness ?? 1    // 1 = perfectly rigid, lower = squishy

        const totalMass = options.mass ?? 80
        let weights = specs.map(sp => sp.weight ?? polyhedronVolume(sp.verts, sp.faces))
        let wsum = weights.reduce((a, b) => a + b, 0)
        if (!(wsum > 0)) { weights = specs.map(() => 1); wsum = specs.length }

        this.pts = []
        this.parts = []
        specs.forEach((sp, si) => {
            const pm = totalMass * weights[si] / wsum / sp.verts.length
            const pts = sp.verts.map(([lx, ly, lz]) => {
                const [rx, ry, rz] = rotate(lx, ly, lz, ax, ay, az)
                return new Obj3({
                    x: cx + rx, y: cy + ry, z: cz + rz,
                    vx, vy, vz,
                    rad: 0,
                    bounce: options.bounce ?? 0,
                    fixed: this.f,
                    mass: pm,
                })
            })
            this.pts.push(...pts)
            this.parts.push(new Part3(this, pts, sp.verts, sp.faces))
        })

        this.resetRest()

        if (wx !== 0 || wy !== 0 || wz !== 0) {
            // spin about the centre of mass: add w x r to every particle's velocity
            const com = this.com()
            for (const q of this.pts) {
                const rx = q.p.x - com.x, ry = q.p.y - com.y, rz = q.p.z - com.z
                q.pp.x -= wy * rz - wz * ry
                q.pp.y -= wz * rx - wx * rz
                q.pp.z -= wx * ry - wy * rx
            }
        }
        this.update()
    }

    static box(options) {
        return new Rigid3({ ...options, parts: [{ w: options.w ?? 40, h: options.h ?? 40, d: options.d ?? 40 }] })
    }

    clone() {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.pts = this.pts.map(point => point.clone())
        const pointCopies = new Map(this.pts.map((point, index) => [point, copy.pts[index]]))
        copy.parts = this.parts.map(part => part.clone(copy, pointCopies))
        copy.rest = this.rest.map(point => point.slice())
        copy.q = { ...this.q }
        copy._A = this._A.slice()
        copy.update()
        return copy
    }

    // mass-weighted centre of the particles, from where they are now
    com() {
        let m = 0, x = 0, y = 0, z = 0
        for (const q of this.pts) { m += q.m; x += q.m * q.p.x; y += q.m * q.p.y; z += q.m * q.p.z }
        return { x: x / m, y: y / m, z: z / m }
    }

    // Records the current pose as the rest shape. Called at creation and after a weld.
    resetRest() {
        const pts = this.pts
        let m = 0, x = 0, y = 0, z = 0
        for (const q of pts) { m += q.m; x += q.m * q.p.x; y += q.m * q.p.y; z += q.m * q.p.z }
        x /= m; y /= m; z /= m
        this.mtot = m
        this.rest = pts.map(q => [q.p.x - x, q.p.y - y, q.p.z - z])
        this.q = { w: 1, x: 0, y: 0, z: 0 }       // current orientation relative to the rest shape
        this._A = new Array(9).fill(0)
    }

    weld(other) {
        if (other === this) return this
        for (const part of other.parts) { part.body = this; this.parts.push(part) }
        this.pts = this.pts.concat(other.pts)
        other.parts = []
        other.pts = []
        this.f = this.f || other.f
        for (const q of this.pts) q.f = this.f
        this.resetRest()
        this.update()
        return this
    }

    // Fixed bodies don't move. The flag has to reach every particle (they are what integrates), so it
    // is an accessor: `body.f = true` behaves the same as passing fixed: true when the body is made.
    get f() { return this._f }
    set f(v) {
        if (v === this._f) return
        this._f = v
        if (!this.pts) return          // called from the constructor, before the particles exist
        for (const q of this.pts) {
            q.f = v
            q.pp.x = q.p.x; q.pp.y = q.p.y; q.pp.z = q.p.z   // no leftover velocity when switching
        }
    }

    get center() { return { x: this.cx, y: this.cy, z: this.cz } }

    // bounding box of the whole body, each part's own bounds, and the centre of mass
    update() {
        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
        for (const part of this.parts) {
            part.update()
            if (part.minX < minX) minX = part.minX
            if (part.minY < minY) minY = part.minY
            if (part.minZ < minZ) minZ = part.minZ
            if (part.maxX > maxX) maxX = part.maxX
            if (part.maxY > maxY) maxY = part.maxY
            if (part.maxZ > maxZ) maxZ = part.maxZ
        }
        this.minX = minX; this.minY = minY; this.minZ = minZ
        this.maxX = maxX; this.maxY = maxY; this.maxZ = maxZ
        const c = this.com()
        this.cx = c.x; this.cy = c.y; this.cz = c.z
    }

    integrate(gravity) {
        for (const q of this.pts) q.integrate(gravity)   // Obj3.integrate skips fixed particles
    }

    collideWalls(type, ...walls) {
        if (this.f) return
        for (const q of this.pts) q.collideWalls(type, ...walls)
    }
    solveConstraints() {
        if (this.f) return
        const pts = this.pts, rest = this.rest, n = pts.length
        let cx = 0, cy = 0, cz = 0
        for (let i = 0; i < n; i++) {
            const m = pts[i].m, p = pts[i].p
            cx += m * p.x; cy += m * p.y; cz += m * p.z
        }
        cx /= this.mtot; cy /= this.mtot; cz /= this.mtot

        // A = sum of m * (p - centre) * rest^T
        const A = this._A
        A.fill(0)
        for (let i = 0; i < n; i++) {
            const m = pts[i].m
            const px = m * (pts[i].p.x - cx), py = m * (pts[i].p.y - cy), pz = m * (pts[i].p.z - cz)
            const r = rest[i]
            A[0] += px * r[0]; A[1] += px * r[1]; A[2] += px * r[2]
            A[3] += py * r[0]; A[4] += py * r[1]; A[5] += py * r[2]
            A[6] += pz * r[0]; A[7] += pz * r[1]; A[8] += pz * r[2]
        }
        const q = this.q
        extractRotation(A, q)

        const w = q.w, x = q.x, y = q.y, z = q.z
        const r00 = 1 - 2 * (y * y + z * z), r01 = 2 * (x * y - w * z), r02 = 2 * (x * z + w * y)
        const r10 = 2 * (x * y + w * z), r11 = 1 - 2 * (x * x + z * z), r12 = 2 * (y * z - w * x)
        const r20 = 2 * (x * z - w * y), r21 = 2 * (y * z + w * x), r22 = 1 - 2 * (x * x + y * y)
        const k = this.stiffness
        for (let i = 0; i < n; i++) {
            const r = rest[i], p = pts[i].p
            const gx = cx + r00 * r[0] + r01 * r[1] + r02 * r[2]
            const gy = cy + r10 * r[0] + r11 * r[1] + r12 * r[2]
            const gz = cz + r20 * r[0] + r21 * r[1] + r22 * r[2]
            p.x += (gx - p.x) * k
            p.y += (gy - p.y) * k
            p.z += (gz - p.z) * k
        }
    }

    // ball (Obj3) vs every part of this body
    collideBall(ball) {
        const r = ball.r, c = ball.p
        if (c.x < this.minX - r || c.x > this.maxX + r ||
            c.y < this.minY - r || c.y > this.maxY + r ||
            c.z < this.minZ - r || c.z > this.maxZ + r) return
        for (const part of this.parts) part.collideBall(ball)
    }

    // this body vs another: every part against every part (parts of one body never collide)
    collideBody(other) {
        if (this.f && other.f) return
        if (this.maxX < other.minX || other.maxX < this.minX ||
            this.maxY < other.minY || other.maxY < this.minY ||
            this.maxZ < other.minZ || other.maxZ < this.minZ) return
        for (const a of this.parts) {
            for (const b of other.parts) Part3.collide(a, b)
        }
    }
}