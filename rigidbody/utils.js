const rbEPS = 1e-6

function rbVec(x, y) {
  return { x, y }
}
function rbAdd(a, b) {
  return { x: a.x + b.x, y: a.y + b.y }
}
function rbSub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y }
}
function rbMul(v, s) {
  return { x: v.x * s, y: v.y * s }
}
function rbDot(a, b) {
  return a.x * b.x + a.y * b.y
}
function rbCross(a, b) {
  return a.x * b.y - a.y * b.x
}
function rbCrossSV(s, v) {
  return { x: -s * v.y, y: s * v.x }
}
function rbLength(v) {
  return Math.hypot(v.x, v.y)
}
function rbNormalize(v) {
  const m = rbLength(v)
  if (m < rbEPS) return { x: 0, y: 0 }
  return { x: v.x / m, y: v.y / m }
}
function rbRotate(v, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

function rbCentroid(verts) {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < verts.length; i++) {
    const v0 = verts[i]
    const v1 = verts[(i + 1) % verts.length]
    const cross = rbCross(v0, v1)
    area += cross
    cx += (v0.x + v1.x) * cross
    cy += (v0.y + v1.y) * cross
  }
  area *= 0.5
  if (Math.abs(area) < rbEPS) return { x: 0, y: 0 }
  cx /= 6 * area
  cy /= 6 * area
  return { x: cx, y: cy }
}

function rbCenterVertices(verts) {
  const center = rbCentroid(verts)
  const local = verts.map((v) => rbSub(v, center))
  return { local, center }
}

function rbComputeInertia(mass, verts) {
  let denom = 0
  let numer = 0
  for (let i = 0; i < verts.length; i++) {
    const v0 = verts[i]
    const v1 = verts[(i + 1) % verts.length]
    const cross = rbCross(v0, v1)
    const term = rbDot(v0, v0) + rbDot(v0, v1) + rbDot(v1, v1)
    numer += cross * term
    denom += cross
  }
  if (Math.abs(denom) < rbEPS) return 0
  const inertia = (mass / 6) * (numer / denom)
  return Math.abs(inertia)
}

function rbProjectVerts(verts, axis) {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < verts.length; i++) {
    const p = rbDot(verts[i], axis)
    if (p < min) min = p
    if (p > max) max = p
  }
  return { min, max }
}

function rbGetAxes(verts) {
  const axes = []
  for (let i = 0; i < verts.length; i++) {
    const v0 = verts[i]
    const v1 = verts[(i + 1) % verts.length]
    const edge = rbSub(v1, v0)
    const axis = rbNormalize({ x: edge.y, y: -edge.x })
    if (rbLength(axis) > 0) axes.push(axis)
  }
  return axes
}

function rbFindMTV(vertsA, vertsB, centerA, centerB) {
  let minOverlap = Infinity
  let smallestAxis = null
  const axes = rbGetAxes(vertsA).concat(rbGetAxes(vertsB))
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i]
    const projA = rbProjectVerts(vertsA, axis)
    const projB = rbProjectVerts(vertsB, axis)
    if (projA.max < projB.min || projB.max < projA.min) {
      return null
    }
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min)
    if (overlap < minOverlap) {
      minOverlap = overlap
      smallestAxis = axis
    }
  }
  if (!smallestAxis) return null
  const dir = rbSub(centerB, centerA)
  if (rbDot(smallestAxis, dir) < 0) {
    smallestAxis = rbMul(smallestAxis, -1)
  }
  return { normal: smallestAxis, depth: minOverlap }
}

function rbSupport(verts, dir) {
  let best = -Infinity
  let res = verts[0]
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i]
    const proj = rbDot(v, dir)
    if (proj > best) {
      best = proj
      res = v
    }
  }
  return res
}

function rbAABB(verts) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i]
    if (v.x < minX) minX = v.x
    if (v.x > maxX) maxX = v.x
    if (v.y < minY) minY = v.y
    if (v.y > maxY) maxY = v.y
  }
  return { minX, minY, maxX, maxY }
}

function rbComputeRadius(localVerts) {
  let r = 0
  for (let i = 0; i < localVerts.length; i++) {
    const v = localVerts[i]
    const d = Math.hypot(v.x, v.y)
    if (d > r) r = d
  }
  return r
}

function rbBoxVerts(w, h) {
  const hw = w * 0.5
  const hh = h * 0.5
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
}

function rbNgonVerts(radius, sides) {
  const verts = []
  const step = (Math.PI * 2) / Math.max(3, sides)
  for (let i = 0; i < sides; i++) {
    const a = i * step
    verts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius })
  }
  return verts
}
