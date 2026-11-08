
import * as THREE from "three/webgpu"
import { Rigid3 } from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@d8c5160b6b7eef7340987958a468fd2e2fab4fd7/rigid.js";
import { Obj3 } from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@d8c5160b6b7eef7340987958a468fd2e2fab4fd7/obj.js";
import { Fan3 } from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@d8c5160b6b7eef7340987958a468fd2e2fab4fd7/fan.js";
import { Tcan3 } from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@d8c5160b6b7eef7340987958a468fd2e2fab4fd7/tcan.js";
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
const BOX_FACES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 2, 6, 5]
]
export function pack(engine) {
    return JSON.stringify({
        version: 1,
        walls: engine.walls,
        objs: engine.objs.map(obj => ({
            x: obj.p.x,
            y: obj.p.y,
            z: obj.p.z,
            r: obj.r,
            m: obj.m,
            f: obj.f,
            c: obj.c
        })),
        rbs: engine.rigidbodies.map(rb => ({
            fixed: rb.f,
            color: rb.color,
            stiffness: rb.stiffness,
            mass: rb.mtot,
            parts: rb.parts.map(part => ({
              verts: part.pts.map(p => [p.p.x, p.p.y, p.p.z]),
              faces: part.faces
            }))
        })),
        fans: engine.fans,
        tcans: engine.tcans,
        walls: engine.walls
    })
}

function buildPartMesh(part, color) {
  const center = part.pts.reduce((sum, point) => ({
    x: sum.x + point.p.x / part.pts.length,
    y: sum.y + point.p.y / part.pts.length,
    z: sum.z + point.p.z / part.pts.length
  }), { x: 0, y: 0, z: 0 })
  const positions = []
  const normals = []
  const vertexMap = []

  const addTri = (aIndex, bIndex, cIndex) => {
    const a = part.pts[aIndex].p
    const b = part.pts[bIndex].p
    const c = part.pts[cIndex].p
    positions.push(
      a.x - center.x, a.y - center.y, a.z - center.z,
      b.x - center.x, b.y - center.y, b.z - center.z,
      c.x - center.x, c.y - center.y, c.z - center.z
    )
    vertexMap.push(aIndex, bIndex, cIndex)
    const ab = [b.x - a.x, b.y - a.y, b.z - a.z]
    const ac = [c.x - a.x, c.y - a.y, c.z - a.z]
    const n = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    const len = Math.hypot(n[0], n[1], n[2]) || 1
    const nn = [n[0] / len, n[1] / len, n[2] / len]
    normals.push(...nn, ...nn, ...nn)
  }

  for (const face of part.faces) {
    for (let index = 1; index < face.length - 1; index++) {
      addTri(face[0], face[index], face[index + 1])
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(center.x, center.y, center.z)

  return { mesh, vertexMap }
}

function rebuildFanVisual(fan, storedFanMdl) {
  if (!storedFanMdl) return null
  const visual = storedFanMdl.clone(true)
  visual.position.set(fan.pos.x, fan.pos.y, fan.pos.z)
  visual.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(fan.dir.x, fan.dir.y, fan.dir.z).normalize()
  )
  return visual
}

function rebuildTcanVisual(tcan, storedTcanMdl) {
  if (!storedTcanMdl) return null
  const visual = storedTcanMdl.clone(true)
  visual.scale.multiplyScalar(tcan.sz / 20)
  visual.position.set(tcan.pos.x, tcan.pos.y, tcan.pos.z)
  return visual
}

export function unpack(
  data,
  engine,
  cubes,
  balls,
  VCMs,
  cubeParts,
  fanVisuals,
  tcanVisuals,
  scene,
  storedFanMdl = null,
  storedTcanMdl = null
) {
  const { walls = [], objs = [], rbs = [], fans = [], tcans = [] } = data
  const removedRoots = new Set()
  for (const mesh of cubes) {
    removedRoots.add(mesh.parent === scene ? mesh : mesh.parent ?? mesh)
  }
  for (const { mesh } of balls) removedRoots.add(mesh)
  for (const visual of fanVisuals) removedRoots.add(visual)
  for (const { mesh } of tcanVisuals) removedRoots.add(mesh)
  for (const root of removedRoots) root.parent?.remove(root)

  cubes.length = 0
  balls.length = 0
  VCMs.length = 0
  cubeParts.length = 0
  fanVisuals.length = 0

  engine.walls = walls
  engine.objs = []
  engine.rigidbodies = []
  engine.fans = []
  engine.tcans = []

  for (const obj of objs) {
    const body = new Obj3({
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      z: obj.z ?? 0,
      vx: obj.vx ?? 0,
      vy: obj.vy ?? 0,
      vz: obj.vz ?? 0,
      red: obj.c?.[0] ?? 255,
      green: obj.c?.[1] ?? 255,
      blue: obj.c?.[2] ?? 255,
      rad: obj.r ?? 8,
      bounce: obj.bounce ?? 0.1,
      fixed: !!obj.f,
      mass: obj.m ?? 20
    })

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(body.r, 20, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(body.c[0]/255, body.c[1]/255, body.c[2]/255),
        roughness: 0.55
      })
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.set(body.p.x, body.p.y, body.p.z)
    scene.add(mesh)

    engine.objs.push(body)
    balls.push({ body, mesh })
  }
  for (const rbData of rbs) {
    const body = new Rigid3({
      x: rbData.x ?? 0,
      y: rbData.y ?? 0,
      z: rbData.z ?? 0,
      fixed: !!rbData.fixed,
      color: rbData.color ?? 0xffffff,
      stiffness: rbData.stiffness ?? 1,
      mass: rbData.mass ?? 80,
      parts: (rbData.parts ?? []).map(part => ({
        verts: part.verts,
        faces: part.faces ?? (part.verts.length === 8 ? BOX_FACES : undefined)
      }))
    })

    engine.rigidbodies.push(body)

    const group = new THREE.Group()
    scene.add(group)

    for (const part of body.parts) {
      const { mesh, vertexMap } = buildPartMesh(part, body.color)
      group.add(mesh)

      cubes.push(mesh)
      cubeParts.push(part)
      VCMs.push(new Int32Array(vertexMap))
    }
  }
  for (const fan of fans) {
    const visual = rebuildFanVisual(fan, storedFanMdl)
    if (visual) {
      scene.add(visual)
      fanVisuals.push(visual)
    }
    const af = new Fan3(fan.pos,fan.dir,fan.type,fan.s,fan.focus,fan.r)
    engine.fans.push(af)
  }
  for (const tcan of tcans) {
    const visual = rebuildTcanVisual(tcan, storedTcanMdl)
    if (visual) {
      scene.add(visual)
      tcanVisuals.push({ mesh: visual, size: tcan.sz })
    }
    const at = new Tcan3(tcan.pos,tcan.sz,tcan.pRbIn)
    engine.tcans.push(tcan)
  }
}
export function download(data, name){
    const a = document.createElement("a")
    a.style.display="none"
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }))
  a.href=url
    a.download=name
  document.body.appendChild(a)
    a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}