const rigidbodies = []

const rbSettings = {
  damping: 0.999,
  angularDamping: 0.999,
  restitution: 0.2,
  friction: 0.4,
  slop: 0.01,
  percent: 0.8,
  maxVel: 1200,
}

class Rigidbody {
  constructor(localVerts, position, options = {}) {
    this.localVerts = localVerts.map((v) => ({ x: v.x, y: v.y }))
    this.p = { x: position.x, y: position.y }
    const vel = options.vel || { x: 0, y: 0 }
    this.pp = { x: this.p.x - vel.x, y: this.p.y - vel.y }
    this.a = { x: 0, y: 0 }

    this.angle = options.angle || 0
    const angVel = options.angVel || 0
    this.pAngle = this.angle - angVel
    this.angAcc = 0

    this.color = options.color || [200, 200, 200]
    this.restitution =
      options.restitution !== undefined ? options.restitution : rbSettings.restitution
    this.friction =
      options.friction !== undefined ? options.friction : rbSettings.friction
    this.static = Boolean(options.static || options.fixed)

    this.mass = this.static ? 0 : options.mass || 1
    this.invMass = this.static || this.mass === 0 ? 0 : 1 / this.mass
    this.inertia = this.static ? 0 : rbComputeInertia(this.mass || 1, this.localVerts)
    this.invInertia = this.static || this.inertia === 0 ? 0 : 1 / this.inertia

    this.worldVerts = []
    this.radius = rbComputeRadius(this.localVerts)
    this.updateWorldVerts()
  }

  updateWorldVerts() {
    const c = Math.cos(this.angle)
    const s = Math.sin(this.angle)
    this.worldVerts = this.localVerts.map((v) => ({
      x: this.p.x + v.x * c - v.y * s,
      y: this.p.y + v.x * s + v.y * c,
    }))
  }

  applyForce(force, point) {
    if (this.invMass === 0) return
    this.a = rbAdd(this.a, rbMul(force, this.invMass))
    if (point) {
      const r = rbSub(point, this.p)
      this.angAcc += rbCross(r, force) * this.invInertia
    }
  }

  integrate() {
    if (this.invMass === 0) {
      this.updateWorldVerts()
      return
    }

    if (
      typeof grav !== "undefined" &&
      typeof meterPixRatio !== "undefined" &&
      typeof targetRate !== "undefined"
    ) {
      this.a.y += (meterPixRatio * grav) / targetRate
    }

    let vx = this.p.x - this.pp.x + this.a.x
    let vy = this.p.y - this.pp.y + this.a.y

    const speed = Math.hypot(vx, vy)
    if (speed > rbSettings.maxVel) {
      const s = rbSettings.maxVel / speed
      vx *= s
      vy *= s
    }

    vx *= rbSettings.damping
    vy *= rbSettings.damping

    this.pp.x = this.p.x
    this.pp.y = this.p.y
    this.p.x += vx
    this.p.y += vy

    let angVel = this.angle - this.pAngle + this.angAcc
    angVel *= rbSettings.angularDamping
    this.pAngle = this.angle
    this.angle += angVel

    this.a.x = 0
    this.a.y = 0
    this.angAcc = 0

    this.updateWorldVerts()
  }

  draw() {
    if (typeof ctx === "undefined") return
    if (!this.worldVerts.length) return
    const ox = typeof emv !== "undefined" ? emv.x : 0
    const oy = typeof emv !== "undefined" ? emv.y : 0
    ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`
    ctx.strokeStyle = "black"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.worldVerts[0].x + ox, this.worldVerts[0].y + oy)
    for (let i = 1; i < this.worldVerts.length; i++) {
      const v = this.worldVerts[i]
      ctx.lineTo(v.x + ox, v.y + oy)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

function rbAddBody(localVerts, position, options = {}) {
  const body = new Rigidbody(localVerts, position, options)
  rigidbodies.push(body)
  return body
}

function addRBBox(x, y, w, h, options = {}) {
  return rbAddBody(rbBoxVerts(w, h), { x, y }, options)
}

function addRBNgon(x, y, radius, sides, options = {}) {
  const opts = { ...options }
  if (sides === 3 && opts.angle === undefined) {
    opts.angle = -Math.PI / 2
  }
  return rbAddBody(rbNgonVerts(radius, sides), { x, y }, opts)
}

function addRBPoly(x, y, localVerts, options = {}) {
  return rbAddBody(localVerts, { x, y }, options)
}

function addRBPolyWorld(worldVerts, options = {}) {
  const centered = rbCenterVertices(worldVerts)
  return rbAddBody(centered.local, centered.center, options)
}

function rbIntegrateAll() {
  const toRemove = []
  for (let i = 0; i < rigidbodies.length; i++) {
    const body = rigidbodies[i]
    if (typeof fans !== "undefined" && typeof disfans !== "undefined" && !disfans) {
      rbApplyFans(body)
    }
    body.integrate()
    if (typeof tcans !== "undefined" && tcans.length) {
      for (let t = 0; t < tcans.length; t++) {
        const tc = tcans[t]
        const r = body.radius
        if (
          body.p.y - r >= tc.y - 30 &&
          body.p.y + r <= tc.y + 40 &&
          body.p.x - r >= tc.x - 30 &&
          body.p.x + r <= tc.x + 30
        ) {
          toRemove.push(i)
          break
        }
      }
    }
  }
  if (toRemove.length) {
    toRemove.sort((a, b) => b - a)
    for (let i = 0; i < toRemove.length; i++) {
      rigidbodies.splice(toRemove[i], 1)
    }
  }
}

function rbDrawAll() {
  for (let i = 0; i < rigidbodies.length; i++) {
    rigidbodies[i].draw()
  }
}

function rbApplyImpulse(body, impulse, contact) {
  if (body.invMass === 0) return
  const v = rbSub(body.p, body.pp)
  const vNew = rbAdd(v, rbMul(impulse, body.invMass))
  body.pp = rbSub(body.p, vNew)

  if (body.invInertia === 0) return
  const r = rbSub(contact, body.p)
  const angVel = body.angle - body.pAngle
  const angVelNew = angVel + rbCross(r, impulse) * body.invInertia
  body.pAngle = body.angle - angVelNew
}

function rbResolveCollision(a, b, normal, depth) {
  const totalInv = a.invMass + b.invMass
  if (totalInv === 0) return

  const correctionMag =
    Math.max(depth - rbSettings.slop, 0) * (rbSettings.percent / totalInv)
  const correction = rbMul(normal, correctionMag)
  if (a.invMass > 0) {
    const adj = rbMul(correction, a.invMass)
    a.p = rbSub(a.p, adj)
    a.pp = rbSub(a.pp, adj)
  }
  if (b.invMass > 0) {
    const adj = rbMul(correction, b.invMass)
    b.p = rbAdd(b.p, adj)
    b.pp = rbAdd(b.pp, adj)
  }
  a.updateWorldVerts()
  b.updateWorldVerts()

  const contactA = rbSupport(a.worldVerts, normal)
  const contactB = rbSupport(b.worldVerts, rbMul(normal, -1))
  const contact = rbMul(rbAdd(contactA, contactB), 0.5)

  const ra = rbSub(contact, a.p)
  const rbv = rbSub(contact, b.p)

  const va = rbSub(a.p, a.pp)
  const vb = rbSub(b.p, b.pp)
  const wa = a.angle - a.pAngle
  const wb = b.angle - b.pAngle

  const velA = rbAdd(va, rbCrossSV(wa, ra))
  const velB = rbAdd(vb, rbCrossSV(wb, rbv))
  const rv = rbSub(velB, velA)

  const velAlongNormal = rbDot(rv, normal)
  if (velAlongNormal > 0) return

  const e = Math.min(a.restitution, b.restitution)
  const raCrossN = rbCross(ra, normal)
  const rbCrossN = rbCross(rbv, normal)
  const invMassSum =
    a.invMass +
    b.invMass +
    raCrossN * raCrossN * a.invInertia +
    rbCrossN * rbCrossN * b.invInertia
  if (invMassSum === 0) return

  const j = (-(1 + e) * velAlongNormal) / invMassSum
  const impulse = rbMul(normal, j)
  rbApplyImpulse(a, rbMul(impulse, -1), contact)
  rbApplyImpulse(b, impulse, contact)

  const rvAfter = rbSub(
    rbAdd(rbSub(b.p, b.pp), rbCrossSV(b.angle - b.pAngle, rbv)),
    rbAdd(rbSub(a.p, a.pp), rbCrossSV(a.angle - a.pAngle, ra)),
  )
  const tangent = rbNormalize(rbSub(rvAfter, rbMul(normal, rbDot(rvAfter, normal))))
  if (rbLength(tangent) < rbEPS) return
  const raCrossT = rbCross(ra, tangent)
  const rbCrossT = rbCross(rbv, tangent)
  const invMassSumT =
    a.invMass +
    b.invMass +
    raCrossT * raCrossT * a.invInertia +
    rbCrossT * rbCrossT * b.invInertia
  if (invMassSumT === 0) return

  const jt = -rbDot(rvAfter, tangent) / invMassSumT
  const mu = Math.sqrt(a.friction * b.friction)
  let frictionImpulse
  if (Math.abs(jt) < j * mu) {
    frictionImpulse = rbMul(tangent, jt)
  } else {
    frictionImpulse = rbMul(tangent, -j * mu)
  }
  rbApplyImpulse(a, rbMul(frictionImpulse, -1), contact)
  rbApplyImpulse(b, frictionImpulse, contact)
}

function rbResolveBounds(body) {
  if (body.invMass === 0) return
  const width =
    typeof canvas !== "undefined" && canvas ? canvas.width : innerHeight - 75
  const height =
    typeof canvas !== "undefined" && canvas ? canvas.height : innerHeight - 75
  const bounds = rbAABB(body.worldVerts)
  let collided = false

  const resolvePlane = (normal, penetration) => {
    if (penetration <= 0) return
    collided = true
    const shift = rbMul(normal, penetration)
    body.p = rbAdd(body.p, shift)
    body.pp = rbAdd(body.pp, shift)

    const contact = rbSupport(body.worldVerts, rbMul(normal, -1))
    const r = rbSub(contact, body.p)
    const v = rbSub(body.p, body.pp)
    const w = body.angle - body.pAngle
    const velAtContact = rbAdd(v, rbCrossSV(w, r))
    const velAlongNormal = rbDot(velAtContact, normal)
    if (velAlongNormal > 0) return

    const raCrossN = rbCross(r, normal)
    const invMassSum = body.invMass + raCrossN * raCrossN * body.invInertia
    if (invMassSum === 0) return
    const j = (-(1 + body.restitution) * velAlongNormal) / invMassSum
    const impulse = rbMul(normal, j)
    rbApplyImpulse(body, impulse, contact)

    const velAfter = rbAdd(
      rbSub(body.p, body.pp),
      rbCrossSV(body.angle - body.pAngle, r),
    )
    const tangent = rbNormalize(
      rbSub(velAfter, rbMul(normal, rbDot(velAfter, normal))),
    )
    if (rbLength(tangent) < rbEPS) return
    const raCrossT = rbCross(r, tangent)
    const invMassSumT = body.invMass + raCrossT * raCrossT * body.invInertia
    if (invMassSumT === 0) return
    const jt = -rbDot(velAfter, tangent) / invMassSumT
    const mu = body.friction
    const frictionImpulse =
      Math.abs(jt) < j * mu ? rbMul(tangent, jt) : rbMul(tangent, -j * mu)
    rbApplyImpulse(body, frictionImpulse, contact)
  }

  if (bounds.minX < 0) resolvePlane({ x: 1, y: 0 }, -bounds.minX)
  if (bounds.maxX > width) resolvePlane({ x: -1, y: 0 }, bounds.maxX - width)
  if (bounds.minY < 0) resolvePlane({ x: 0, y: 1 }, -bounds.minY)
  if (bounds.maxY > height) resolvePlane({ x: 0, y: -1 }, bounds.maxY - height)

  if (collided) body.updateWorldVerts()
}

function rbResolveAll() {
  for (let i = 0; i < rigidbodies.length; i++) {
    const a = rigidbodies[i]
    for (let j = i + 1; j < rigidbodies.length; j++) {
      const b = rigidbodies[j]
      if (a.invMass === 0 && b.invMass === 0) continue
      const dx = a.p.x - b.p.x
      const dy = a.p.y - b.p.y
      const r = a.radius + b.radius
      if (dx * dx + dy * dy > r * r) continue
      const mtv = rbFindMTV(a.worldVerts, b.worldVerts, a.p, b.p)
      if (!mtv) continue
      rbResolveCollision(a, b, mtv.normal, mtv.depth)
    }
  }
  rbResolveWorldObjects()
  for (let i = 0; i < rigidbodies.length; i++) {
    rbResolveBounds(rigidbodies[i])
  }
}

function rbClear() {
  rigidbodies.length = 0
}

function rbApplyFans(body) {
  if (!fans || !fans.length) return
  for (let i = 0; i < fans.length; i++) {
    const f = fans[i]
    const p2 = rbAdd(f.p, f.dir)
    const d =
      ((body.p.x - f.p.x) * (p2.x - f.p.x) + (body.p.y - f.p.y) * (p2.y - f.p.y)) /
      rbLength(rbSub(f.p, p2)) ** 2
    const cx = f.p.x + d * (p2.x - f.p.x)
    const cy = f.p.y + d * (p2.y - f.p.y)
    const dbcp = Math.hypot(body.p.x - cx, body.p.y - cy)
    const dfcp = Math.hypot(f.p.x - cx, f.p.y - cy)
    if (dbcp <= body.radius + 10 && dfcp <= f.md) {
      const strength = (f.s * f.md) / Math.max(1, dfcp * f.md)
      const force = rbMul(rbNormalize(f.dir), strength)
      body.applyForce(force)
    }
  }
}

function rbResolveWorldObjects() {
  if (typeof lines !== "undefined" && lines.length) {
    for (let i = 0; i < rigidbodies.length; i++) {
      const body = rigidbodies[i]
      for (let j = 0; j < lines.length; j++) {
        rbResolveBodyLine(body, lines[j])
      }
    }
  }
  if (typeof objs !== "undefined" && objs.length) {
    for (let i = 0; i < rigidbodies.length; i++) {
      const body = rigidbodies[i]
      for (let j = 0; j < objs.length; j++) {
        rbResolveBodyBall(body, objs[j])
      }
    }
  }
  if (typeof valves !== "undefined" && valves.length) {
    for (let i = 0; i < rigidbodies.length; i++) {
      const body = rigidbodies[i]
      for (let j = 0; j < valves.length; j++) {
        const v = valves[j]
        if (v.o) continue
        rbResolveBodyCircle(body, v.p, v.r, 0, body.restitution, body.friction, null)
      }
    }
  }
}

function rbResolveBodyBall(body, ball) {
  const invMass = ball.f ? 0 : 1 / Math.max(1e-6, ball.w || 1)
  const restitution = Math.min(
    body.restitution,
    ball.b !== undefined ? ball.b : body.restitution,
  )
  const friction = Math.sqrt(body.friction * (ball.friction || body.friction))
  rbResolveBodyCircle(body, ball, ball.r, invMass, restitution, friction)
}

function rbResolveBodyCircle(body, circle, radius, invMass, restitution, friction) {
  const center = circle.p
  const hasPP = circle.pp && typeof circle.pp.x === "number"
  const mtv = rbPolyCircleMTV(body.worldVerts, body.p, center, radius)
  if (!mtv) return
  const totalInv = body.invMass + invMass
  if (totalInv === 0) return

  const correctionMag =
    Math.max(mtv.depth - rbSettings.slop, 0) * (rbSettings.percent / totalInv)
  const correction = rbMul(mtv.normal, correctionMag)
  if (body.invMass > 0) {
    const adj = rbMul(correction, body.invMass)
    body.p = rbSub(body.p, adj)
    body.pp = rbSub(body.pp, adj)
  }
  if (invMass > 0) {
    const adj = rbMul(correction, invMass)
    center.x += adj.x
    center.y += adj.y
    if (hasPP) {
      circle.pp.x += adj.x
      circle.pp.y += adj.y
    }
  }
  body.updateWorldVerts()

  const contact = rbSub(center, rbMul(mtv.normal, radius))
  const ra = rbSub(contact, body.p)
  const va = rbSub(body.p, body.pp)
  const wa = body.angle - body.pAngle
  const velA = rbAdd(va, rbCrossSV(wa, ra))
  const velB = invMass === 0 || !hasPP ? { x: 0, y: 0 } : rbSub(center, circle.pp)
  const rv = rbSub(velB, velA)
  const velAlongNormal = rbDot(rv, mtv.normal)
  if (velAlongNormal > 0) return

  const raCrossN = rbCross(ra, mtv.normal)
  const invMassSum = body.invMass + invMass + raCrossN * raCrossN * body.invInertia
  if (invMassSum === 0) return
  const j = (-(1 + restitution) * velAlongNormal) / invMassSum
  const impulse = rbMul(mtv.normal, j)
  rbApplyImpulse(body, rbMul(impulse, -1), contact)
  if (invMass > 0 && hasPP) {
    const v = rbSub(center, circle.pp)
    const vNew = rbAdd(v, rbMul(impulse, invMass))
    circle.pp = rbSub(center, vNew)
  }

  const velAfterA = rbAdd(
    rbSub(body.p, body.pp),
    rbCrossSV(body.angle - body.pAngle, ra),
  )
  const velAfterB = invMass === 0 || !hasPP ? { x: 0, y: 0 } : rbSub(center, circle.pp)
  const rvAfter = rbSub(velAfterB, velAfterA)
  const tangent = rbNormalize(rbSub(rvAfter, rbMul(mtv.normal, rbDot(rvAfter, mtv.normal))))
  if (rbLength(tangent) < rbEPS) return
  const raCrossT = rbCross(ra, tangent)
  const invMassSumT = body.invMass + invMass + raCrossT * raCrossT * body.invInertia
  if (invMassSumT === 0) return
  const jt = -rbDot(rvAfter, tangent) / invMassSumT
  const mu = friction
  const frictionImpulse =
    Math.abs(jt) < j * mu ? rbMul(tangent, jt) : rbMul(tangent, -j * mu)
  rbApplyImpulse(body, rbMul(frictionImpulse, -1), contact)
  if (invMass > 0 && hasPP) {
    const v = rbSub(center, circle.pp)
    const vNew = rbAdd(v, rbMul(frictionImpulse, invMass))
    circle.pp = rbSub(center, vNew)
  }
}

function rbPolyCircleMTV(verts, centerA, centerB, radius) {
  let minOverlap = Infinity
  let smallestAxis = null
  const axes = rbGetAxes(verts)
  let closestV = verts[0]
  let closestD = Infinity
  for (let i = 0; i < verts.length; i++) {
    const d = rbLength(rbSub(verts[i], centerB))
    if (d < closestD) {
      closestD = d
      closestV = verts[i]
    }
  }
  const extraAxis = rbNormalize(rbSub(closestV, centerB))
  if (rbLength(extraAxis) > rbEPS) axes.push(extraAxis)

  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i]
    const projA = rbProjectVerts(verts, axis)
    const projB = { min: rbDot(centerB, axis) - radius, max: rbDot(centerB, axis) + radius }
    if (projA.max < projB.min || projB.max < projA.min) return null
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min)
    if (overlap < minOverlap) {
      minOverlap = overlap
      smallestAxis = axis
    }
  }
  if (!smallestAxis) return null
  const dir = rbSub(centerB, centerA)
  if (rbDot(smallestAxis, dir) < 0) smallestAxis = rbMul(smallestAxis, -1)
  return { normal: smallestAxis, depth: minOverlap }
}

function rbResolveBodyLine(body, line) {
  const lineData = rbGetLineWorld(line)
  if (!lineData) return
  const { p1, p2, w } = lineData
  const capRadius = (w || 1) * 0.5
  const proj = rbClosestPointOnSegmentInfo(body.p, p1, p2)
  const dir = rbNormalize(rbSub(p2, p1))
  if (rbLength(dir) < rbEPS) return
  const n = { x: -dir.y, y: dir.x }
  const hw = (w || 1) * 0.5
  const v1 = rbAdd(p1, rbMul(n, hw))
  const v2 = rbAdd(p2, rbMul(n, hw))
  const v3 = rbSub(p2, rbMul(n, hw))
  const v4 = rbSub(p1, rbMul(n, hw))
  const rect = [v1, v2, v3, v4]
  const center = rbMul(rbAdd(p1, p2), 0.5)
  const mtv = rbFindMTV(body.worldVerts, rect, body.p, center)
  if (mtv) {
    const totalInv = body.invMass
    if (totalInv !== 0) {
      const correctionMag =
        Math.max(mtv.depth - rbSettings.slop, 0) *
        (rbSettings.percent / totalInv)
      const correction = rbMul(mtv.normal, correctionMag)
      if (body.invMass > 0) {
        const adj = rbMul(correction, body.invMass)
        body.p = rbSub(body.p, adj)
        body.pp = rbSub(body.pp, adj)
      }
      body.updateWorldVerts()

      const contactA = rbSupport(body.worldVerts, mtv.normal)
      const contactB = proj.point
      const contact = rbMul(rbAdd(contactA, contactB), 0.5)

      const ra = rbSub(contact, body.p)
      const va = rbSub(body.p, body.pp)
      const wa = body.angle - body.pAngle
      const velA = rbAdd(va, rbCrossSV(wa, ra))
      const rv = rbMul(velA, -1)
      const velAlongNormal = rbDot(rv, mtv.normal)
      if (velAlongNormal <= 0) {
        const raCrossN = rbCross(ra, mtv.normal)
        const invMassSum = body.invMass + raCrossN * raCrossN * body.invInertia
        if (invMassSum !== 0) {
          const j = (-(1 + body.restitution) * velAlongNormal) / invMassSum
          const impulse = rbMul(mtv.normal, j)
          rbApplyImpulse(body, rbMul(impulse, -1), contact)

          const velAfter = rbAdd(
            rbSub(body.p, body.pp),
            rbCrossSV(body.angle - body.pAngle, ra),
          )
          const rvAfter = rbMul(velAfter, -1)
          const tangent = rbNormalize(
            rbSub(rvAfter, rbMul(mtv.normal, rbDot(rvAfter, mtv.normal))),
          )
          if (rbLength(tangent) >= rbEPS) {
            const raCrossT = rbCross(ra, tangent)
            const invMassSumT =
              body.invMass + raCrossT * raCrossT * body.invInertia
            if (invMassSumT !== 0) {
              const jt = -rbDot(velAfter, tangent) / invMassSumT
              const mu = body.friction
              const frictionImpulse =
                Math.abs(jt) < j * mu
                  ? rbMul(tangent, jt)
                  : rbMul(tangent, -j * mu)
              rbApplyImpulse(body, rbMul(frictionImpulse, -1), contact)
            }
          }
        }
      }
    }
  }

  if (proj.t <= 0 || proj.t >= 1) {
    const capPoint = proj.t <= 0 ? p1 : p2
    rbResolveBodyCircle(
      body,
      { p: { x: capPoint.x, y: capPoint.y } },
      capRadius,
      0,
      body.restitution,
      body.friction,
    )
  }
}

function rbGetLineWorld(l) {
  if (!l || !l.p1 || !l.p2) return null
  let np = { x: 0, y: 0 }
  if (l.rail && l.rail.has && l.rail.kfs && l.rail.kfs.length) {
    let rl = 0
    for (let i = 0; i < l.rail.kfs.length; i++) {
      rl += rbLength(rbSub(l.rail.kfs[i].sp, l.rail.kfs[i].ep))
    }
    let td = l.rail.t / Math.max(1e-6, rl)
    if (td > 1) td = 2 - td
    const nrail = rbSub(l.rail.kfs[0].ep, l.rail.kfs[0].sp)
    np = rbMul(nrail, td)
  }

  let x1 = l.p1.x + np.x
  let y1 = l.p1.y + np.y
  let x2 = l.p2.x + np.x
  let y2 = l.p2.y + np.y
  if (l.m && l.m.h) {
    const sp1 = rbSub(l.p1, rbAdd(l.m.p, np))
    const sp2 = rbSub(l.p2, rbAdd(l.m.p, np))
    const c = Math.cos(l.m.t)
    const s = Math.sin(l.m.t)
    x1 = sp1.x * c - sp1.y * s + l.m.p.x + np.x
    y1 = sp1.x * s + sp1.y * c + l.m.p.y + np.y
    x2 = sp2.x * c - sp2.y * s + l.m.p.x + np.x
    y2 = sp2.x * s + sp2.y * c + l.m.p.y + np.y
  }
  return { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, w: l.w || 1 }
}

function rbClosestPointOnSegment(p, a, b) {
  const ab = rbSub(b, a)
  const abLen2 = rbDot(ab, ab)
  if (abLen2 < rbEPS) return { x: a.x, y: a.y }
  const t = Math.max(0, Math.min(1, rbDot(rbSub(p, a), ab) / abLen2))
  return { x: a.x + ab.x * t, y: a.y + ab.y * t }
}

function rbClosestPointOnSegmentInfo(p, a, b) {
  const ab = rbSub(b, a)
  const abLen2 = rbDot(ab, ab)
  if (abLen2 < rbEPS) return { point: { x: a.x, y: a.y }, t: 0 }
  const t = Math.max(0, Math.min(1, rbDot(rbSub(p, a), ab) / abLen2))
  return { point: { x: a.x + ab.x * t, y: a.y + ab.y * t }, t }
}
