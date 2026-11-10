// Coding style:
// Always use camelCase
// NO semicolons unless in for loop or dense variables (e.g. let a=2; const b=2; var c=1;)
// Use a ? b : c a lot, but if statements if better
// Use shortened names because fast to type
// Make stupid comments
// Only comment when confusing or info
// No emojis (except for the next line)
// american (god bless america but not trump) 🦅

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

import * as THREE from "three/webgpu"
import {Engine} from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@939ab5031bb6ca9f33c16ab8343e297efbb1984d/main.js"
//import {addVec3, Engine} from "./fizks/main.js"
import { pack, unpack, download } from "./fsave.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { pass, uniform } from 'three/tsl'
import { outline } from 'three/addons/tsl/display/OutlineNode.js'
const loader = new GLTFLoader()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

selectedObject = { type: 'box', index: 0, fxd: false }
let welding = false
let sobj0,sobjn=0
let adding = "none"
const BOX = { x0: -200, y0: -200, x1: 200, y1: 200, z0: -200, z1: 200 }
engine = new Engine({
    mode: 'plain',
    dimensions: 3,
    walltype: 'square',
    walls: [BOX.x0, BOX.y0, BOX.x1, BOX.y1, BOX.z0, BOX.z1],
    gravity: -0.098,
    substeps: 8
})
const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: true  })
renderer.shadowMap.enabled = true
renderer.setSize(WIDTH, HEIGHT)
renderer.setClearColor(0xdddddd, 1)
document.body.appendChild(renderer.domElement)
let paused = false
await renderer.init()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(100, WIDTH / HEIGHT)
camera.position.z = 500
scene.add(camera)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4) //briter
scene.add(ambientLight)
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4)
keyLight.position.set(-300, 450, 600)
keyLight.castShadow = true
keyLight.shadow.camera.top = 400
keyLight.shadow.camera.bottom = -400
keyLight.shadow.camera.left = -400
keyLight.shadow.camera.right = 400
keyLight.shadow.camera.near = 0.5
keyLight.shadow.camera.far = 2000
keyLight.shadow.mapSize.width = 1024
keyLight.shadow.mapSize.height = 1024
scene.background = new THREE.Color(0x1a1a1a)
scene.add(keyLight)

const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x1a1a1a, 0.8)
scene.add(hemi)
const grid = new THREE.GridHelper(800, 40, 0xff0000, 0xffffff)
grid.position.y = -199.2
scene.add(grid)
cubes = []
let VCMs = []
cubeParts = []
balls = []
const controls = new OrbitControls( camera, renderer.domElement )
camera.position.set( 0, 20, 100 )
controls.update()
let am
let storedFanMdl
let storedCurMdl
let storedTcanMdl
let fanPlacement = null
let fanVisuals = []
let tcanVisuals = []
let fanAirVisual = null
let fanAirVisualData = null
loader.load(
    'Adder.glb',
    function (gltf) {
        am = gltf.scene
        am.traverse(function (child) {
            if (child.isMesh) {
                child.material.vertexColors = true
                if (child.material.color) {
                    child.material.color.setHex(0xffffff)
                }
                child.material.needsUpdate = true
            }
        })
        am.scale.set(20, 20, 20)
        am.userData.initialTransform = {
            position: am.position.clone(),
            quaternion: am.quaternion.clone(),
            scale: am.scale.clone()
        }
        scene.add(am)
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    function (error) {
        console.error('An error happened', error)
    }
)
loader.load(
    'fan.glb',
    function (gltf) {
        storedFanMdl = gltf.scene
        storedFanMdl.traverse(function (child) {
            if (child.isMesh) {
                child.material.vertexColors = true
                if (child.material.color) {
                    child.material.color.setHex(0xffffff)
                }
                child.material.needsUpdate = true
            }
        })
        storedFanMdl.scale.set(20, 20, 20)
        storedFanMdl.userData.initialTransform = {
            position: storedFanMdl.position.clone(),
            quaternion: storedFanMdl.quaternion.clone(),
            scale: storedFanMdl.scale.clone()
        }
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    function (error) {
        console.error('An error happened', error)
    }
)
loader.load(
    'tcan.glb',
    function (gltf) {
        storedTcanMdl = gltf.scene
        storedTcanMdl.traverse(function (child) {
            if (child.isMesh) {
                child.material.vertexColors = true
                if (child.material.color) {
                    child.material.color.setHex(0xffffff)
                }
                child.material.needsUpdate = true
            }
        })
        storedTcanMdl.scale.set(20, 20, 20)
        storedTcanMdl.userData.initialTransform = {
            position: storedTcanMdl.position.clone(),
            quaternion: storedTcanMdl.quaternion.clone(),
            scale: storedTcanMdl.scale.clone()
        }
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    function (error) {
        console.error('An error happened', error)
    }
)

loader.load(
    'cursor.glb',
    function (gltf) {
        storedCurMdl = gltf.scene
        storedCurMdl.traverse(function (child) {
            if (child.isMesh) {
                child.material.vertexColors = true
                if (child.material.color) {
                    child.material.color.setHex(0xffffff)
                }
                child.material.needsUpdate = true
            }
        })
        storedCurMdl.scale.set(20, 20, 20)
        storedCurMdl.userData.initialTransform = {
            position: storedCurMdl.position.clone(),
            quaternion: storedCurMdl.quaternion.clone(),
            scale: storedCurMdl.scale.clone()
        }
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    function (error) {
        console.error('An error happened', error)
    }
)
const selectedForOutline = []
const outlinePass = outline(scene, camera, {
    selectedObjects: selectedForOutline,
    edgeThickness: uniform(1.0),
    edgeGlow: uniform(0.0)
})
const { visibleEdge, hiddenEdge } = outlinePass

const edgeStrength = uniform(4.0)
const visibleEdgeColor = uniform(new THREE.Color('#4772b3'))
const hiddenEdgeColor = uniform(new THREE.Color('#4772b3'))

const outlineColor = visibleEdge.mul(visibleEdgeColor)
    .add(hiddenEdge.mul(hiddenEdgeColor))
    .mul(edgeStrength)

const scenePass = pass(scene, camera)
const renderPipeline = new THREE.RenderPipeline(renderer)
renderPipeline.outputNode = outlineColor.add(scenePass)
function initCb(options){
    const geo = new THREE.BoxGeometry(options.w, options.h, options.d)
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    const material = new THREE.MeshStandardMaterial({
        color: options.color ?? 0x0095dd,
        roughness: 0.72
    })
    const cube = new THREE.Mesh(geo, material)
    cube.castShadow = true
    cube.receiveShadow = true
    cubes.push(cube)
    scene.add(cube)
    const poss = geo.attributes.position
    const VCM = new Int32Array(poss.count)
    engine.addBox(options)
    const rb = engine.rigidbodies[engine.rigidbodies.length-1]
    cubeParts.push(rb.parts[0])
    for (let i = 0; i < poss.count; i++) {
        const ogX = poss.getX(i)
        const ogY = poss.getY(i)
        const ogZ = poss.getZ(i)
        const isGx = ogX > 0 ? 1 : 0
        const isGy = ogY > 0 ? 1 : 0
        const isGz = ogZ > 0 ? 1 : 0
        
        let physInd = 0
        if (isGz === 0) {
            physInd = isGy === 0 ? (isGx === 0 ? 0 : 1) : (isGx === 1 ? 2 : 3)
        } else {
            physInd = isGy === 0 ? (isGx === 0 ? 4 : 5) : (isGx === 1 ? 6 : 7)
        }
        VCM[i] = physInd
    }
    VCMs.push(VCM)
}
function partCenter(part){
    let x = 0, y = 0, z = 0
    for (const q of part.pts) { x += q.p.x; y += q.p.y; z += q.p.z }
    const n = part.pts.length
    return { x: x / n, y: y / n, z: z / n }
}
function boxToCube(ind){
    const cb = cubes[ind]
    const part = cubeParts[ind]
    const poss = cb.geometry.attributes.position
    const c = partCenter(part)
    const centerX = c.x
    const centerY = c.y
    const centerZ = c.z
    const inverseRotation = cb.quaternion.clone().invert()
    const localVertex = new THREE.Vector3()
    for (let i = 0; i < poss.count; i++) {
        const physInd = VCMs[ind][i]
        const livePhysPt = part.pts[physInd].p
        localVertex.set(livePhysPt.x - centerX, livePhysPt.y - centerY, livePhysPt.z - centerZ)
            .applyQuaternion(inverseRotation)
            .divide(cb.scale)
        poss.setXYZ(i, localVertex.x, localVertex.y, localVertex.z)
    }

    cb.position.set(centerX, centerY, centerZ)
    poss.needsUpdate = true
    cb.geometry.computeVertexNormals()
}
function boxToCubeALL(){
    for (let i = 0; i < cubes.length; i++){
        boxToCube(i)
    }
}
function addBoxRnd(fixed=false, options={color: '#ff95dd'}){
    initCb({ x: Math.random()*5, y: Math.random()*5, z: Math.random()*5, w: 30, h: 20, d: 30, mass: 60, fixed, ...options })
}

function addBall(fixed=false,rad=8, color="#18a8d1"){
    const radius = rad
    const x = am.position.x
    const z = am.position.z
    const y = am.position.y-25
    
    engine.addObj({ x, y, z, rad: radius, mass: radius**2*Math.PI, bounce: 0.1, fixed })
    const nclr = new THREE.Color(color)
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 20, 14),
        new THREE.MeshStandardMaterial({ color: nclr, roughness: 0.55 })
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    balls.push({ body: engine.objs[engine.objs.length - 1], mesh })
}
function fanAirLength(fan){
    const position = fan.pos
    const direction = fan.dir
    const walls = engine.walls
    const distances = [
        direction.x > 1e-8 ? (walls[2] - position.x) / direction.x : direction.x < -1e-8 ? (walls[0] - position.x) / direction.x : Infinity,
        direction.y > 1e-8 ? (walls[3] - position.y) / direction.y : direction.y < -1e-8 ? (walls[1] - position.y) / direction.y : Infinity,
        direction.z > 1e-8 ? (walls[5] - position.z) / direction.z : direction.z < -1e-8 ? (walls[4] - position.z) / direction.z : Infinity
    ].filter(distance => Number.isFinite(distance) && distance > 0)
    const fallbackLength = Math.max(
        walls[2] - walls[0],
        walls[3] - walls[1],
        walls[5] - walls[4]
    )
    const distance = distances.length ? Math.min(...distances) : fallbackLength
    return Math.max(5, Math.ceil(distance / 5) * 5)
}
function updateFanAirVisual(){
    if (selectedObject.type !== 'fan') {
        if (fanAirVisual) fanAirVisual.visible = false
        return
    }

    const fan = engine.fans[selectedObject.index]
    if (!fan) {
        if (fanAirVisual) fanAirVisual.visible = false
        return
    }

    const length = fanAirLength(fan)
    const geometryChanged = !fanAirVisualData ||
        fanAirVisualData.fan !== fan ||
        fanAirVisualData.length !== length ||
        fanAirVisualData.radius !== fan.r ||
        fanAirVisualData.taper !== fan.focus

    if (!fanAirVisual) {
        const material = new THREE.MeshBasicMaterial({
            color: 0x31c8e8,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false
        })
        fanAirVisual = new THREE.Mesh(new THREE.BufferGeometry(), material)
        fanAirVisual.renderOrder = 2
        scene.add(fanAirVisual)
    }

    if (geometryChanged) {
        if (fanAirVisual.geometry) fanAirVisual.geometry.dispose()
        const farRadius = Math.max(0.01, fan.r + length * Math.tan(fan.focus))
        fanAirVisual.geometry = new THREE.CylinderGeometry(farRadius, fan.r, length, 32, 12, true)
        fanAirVisualData = { fan, length, radius: fan.r, taper: fan.focus }
    }

    const direction = new THREE.Vector3(fan.dir.x, fan.dir.y, fan.dir.z).normalize()
    fanAirVisual.position.set(fan.pos.x, fan.pos.y, fan.pos.z)
        .addScaledVector(direction, length / 2)
    fanAirVisual.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    fanAirVisual.visible = true
}
function fanPlacementPoint(event, surfaceOffset = 0){
    const bounds = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)

    const surfaces = [...cubes, ...balls.map(ball => ball.mesh), ...fanVisuals, ...tcanVisuals.map(item => item.mesh)]
    if (gcube) surfaces.push(gcube)
    if (am) surfaces.push(am)
    scene.updateMatrixWorld(true)
    const hit = raycaster.intersectObjects(surfaces, true)[0]
    if (hit) {
        const point = hit.point.clone()
        if (surfaceOffset > 0 && hit.face) {
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
            const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize()
            point.addScaledVector(normal, surfaceOffset)
        }
        return point
    }

    const normal = camera.getWorldDirection(new THREE.Vector3())
    const placementPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, controls.target)
    return raycaster.ray.intersectPlane(placementPlane, new THREE.Vector3())
}
function setFanPlacementStatus(message){
    const status = document.getElementById('fanstatus')
    if (status) status.textContent = message
}
function cancelFanPlacement(){
    if (!fanPlacement) return
    for (const cursor of fanPlacement.cursors) scene.remove(cursor)
    fanPlacement = null
    adding = 'none'
    controls.enabled = true
    transformControls.visible = true
    setFanPlacementStatus('')
}
function startFanPlacement(){
    if (fanPlacement) {
        cancelFanPlacement()
        return
    }
    if (!storedCurMdl || !storedFanMdl) {
        setFanPlacementStatus('Fan models are still loading.')
        return
    }
    exitGroup()
    transformControls.detach()
    const cursors = [storedCurMdl.clone(true), storedCurMdl.clone(true)]
    for (const cursor of cursors) scene.add(cursor)
    fanPlacement = { type: 'fan', cursors, stage: 'origin', origin: null }
    adding = 'fan-origin'
    controls.enabled = false
    transformControls.visible = false
    setFanPlacementStatus('Click the fan origin. Press Escape to cancel.')
}
function startTcanPlacement(){
    if (fanPlacement) {
        cancelFanPlacement()
        return
    }
    if (!storedCurMdl || !storedTcanMdl) {
        setFanPlacementStatus('Trash-can models are still loading.')
        return
    }
    exitGroup()
    transformControls.detach()
    const cursor = storedCurMdl.clone(true)
    scene.add(cursor)
    fanPlacement = { type: 'tcan', cursors: [cursor], stage: 'origin', origin: null }
    adding = 'tcan'
    controls.enabled = false
    transformControls.visible = false
    setFanPlacementStatus('Click the trash-can base. Press Escape to cancel.')
}
function handleFanPlacementClick(event){
    if (fanPlacement.type === 'tcan') {
        const point = fanPlacementPoint(event)
        if (!point) return
        const size = Number(document.getElementById('tcanSize').value)
        if (!Number.isFinite(size) || size <= 0) {
            setFanPlacementStatus('Enter a positive trash-can size.')
            return
        }

        const position = { x: point.x, y: point.y + size / 2, z: point.z }
        engine.addTcan(position, size)
        const mesh = storedTcanMdl.clone(true)
        mesh.scale.multiplyScalar(size / 20)
        mesh.position.copy(point)
        scene.add(mesh)
        tcanVisuals.push({ mesh, size })
        cancelFanPlacement()
        return
    }

    const originOffset = fanPlacement.stage === 'origin'
        ? Math.max(Number(document.getElementById('frad').value) || 0, 0)
        : 0
    const point = fanPlacementPoint(event, originOffset)
    if (!point) return

    if (fanPlacement.stage === 'origin') {
        fanPlacement.origin = point.clone()
        fanPlacement.cursors[0].position.copy(point)
        fanPlacement.cursors[1].position.copy(point)
        fanPlacement.stage = 'direction'
        adding = 'fan-direction'
        setFanPlacementStatus('Click the direction point.')
        return
    }

    const direction = point.clone().sub(fanPlacement.origin)
    fanPlacement.cursors[1].position.copy(point)
    if (direction.lengthSq() < 1e-6) {
        setFanPlacementStatus('Choose a direction point away from the origin.')
        return
    }

    const speed = Number(document.getElementById('fspd').value)
    const radius = Number(document.getElementById('frad').value)
    const taper = Number(document.getElementById('ftap').value)
    if (!Number.isFinite(speed) || !Number.isFinite(radius) || radius <= 0 ||
        !Number.isFinite(taper) || Math.abs(taper) >= Math.PI / 2) {
        setFanPlacementStatus('Enter a finite speed, positive radius, and taper between -1.57 and 1.57.')
        return
    }

    direction.normalize()
    const origin = fanPlacement.origin
    engine.addFan(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: direction.x, y: direction.y, z: direction.z },
        speed,
        taper,
        { initialRadius: radius }
    )

    const visual = storedFanMdl.clone(true)
    visual.position.copy(origin)
    visual.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction)
    scene.add(visual)
    fanVisuals.push(visual)
    cancelFanPlacement()
}
function clear(){
    cancelFanPlacement()
    exitGroup()
    if (transformControls) {
        transformControls.detach()
    }
    if (am?.userData.initialTransform) {
        const initial = am.userData.initialTransform
        am.position.copy(initial.position)
        am.quaternion.copy(initial.quaternion)
        am.scale.copy(initial.scale)
        am.updateMatrixWorld(true)
    }
    for (const cube of cubes) {
        scene.remove(cube)
        if (cube.geometry) cube.geometry.dispose()
        if (cube.material) cube.material.dispose()
    }
    for (const item of balls) {
        scene.remove(item.mesh)
        if (item.mesh.geometry) item.mesh.geometry.dispose()
        if (item.mesh.material) item.mesh.material.dispose()
    }
    cubes = []
    VCMs = []
    cubeParts = []
    balls = []
    engine.objs = []
    engine.rigidbodies = []
    engine.fans = []
    engine.tcans = []
    for (const visual of fanVisuals) scene.remove(visual)
    fanVisuals = []
    for (const item of tcanVisuals) scene.remove(item.mesh)
    tcanVisuals = []
    selectedObject = { type: 'box', index: 0, fxd: false }
    outlinePass.selectedObjects = []
    welding = false
    sobjn = 0
    transformControls.visible = true
}
function clearB(){
    exitGroup()
    if (transformControls) {
        transformControls.detach()
    }
    for (const item of balls) {
        scene.remove(item.mesh)
        if (item.mesh.geometry) item.mesh.geometry.dispose()
        if (item.mesh.material) item.mesh.material.dispose()
    }
    balls = []
    engine.objs = []
    selectedObject = engine.rigidbodies.length
        ? { type: 'box', index: 0, fxd: engine.rigidbodies[0].f }
        : { type: 'none', index: -1, fxd: false }
}
function delCur(){
    if (groupActive()) { deleteGroup(); return }
    const typ = selectedObject.type
    const ind = selectedObject.index
    const rb = engine.rigidbodies
    const bs = engine.objs
    if (typ == "box") {
        if (engine.rigidbodies.length < ind+1) return
        const slccb = cubes[ind]
        if (slccb) {
            scene.remove(slccb)
            if (slccb.geometry) slccb.geometry.dispose()
            if (slccb.material) slccb.material.dispose()
            rb.splice(ind, 1)
            cubes.splice(ind, 1)
            VCMs.splice(ind, 1)
            cubeParts.splice(ind, 1)
        }
    }
    if (typ == "ball") {
        if (engine.objs.length < ind + 1) return
        const slctd = balls[ind]
        if (slctd) {
            scene.remove(slctd.mesh)
            if (slctd.mesh.geometry) slctd.mesh.geometry.dispose()
            if (slctd.mesh.material) slctd.mesh.material.dispose()
            bs.splice(ind, 1)
            balls.splice(ind, 1)
        }
    }
    if (typ == "fan") {
        if (ind < 0 || ind >= engine.fans.length) return
        scene.remove(fanVisuals[ind])
        engine.fans.splice(ind, 1)
        fanVisuals.splice(ind, 1)
    }
    if (typ == "tcan") {
        if (ind < 0 || ind >= engine.tcans.length) return
        scene.remove(tcanVisuals[ind].mesh)
        engine.tcans.splice(ind, 1)
        tcanVisuals.splice(ind, 1)
    }
    transformControls.detach()
    if (engine.rigidbodies.length) {
        selectedObject = { type: 'box', index: 0, fxd: engine.rigidbodies[0].f }
    } else if (engine.objs.length) {
        selectedObject = { type: 'ball', index: 0, fxd: engine.objs[0].f }
    } else if (engine.fans.length) {
        selectedObject = { type: 'fan', index: 0, fxd: true }
    } else if (engine.tcans.length) {
        selectedObject = { type: 'tcan', index: 0, fxd: true }
    } else {
        selectedObject = { type: 'none', index: -1, fxd: false }
    }
}
const fchkbx = document.getElementById("fxchk")
const fchkbx2 = document.getElementById("fxchk2")
const clrinp = document.getElementById("bclr")
document.getElementById('add-ball').addEventListener('click', () => {
    const isFixed = fchkbx.checked
    const radius = parseFloat(document.getElementById('bri').value) || 8
    const ballColor = clrinp.value
    addBall(isFixed, radius, ballColor)
})
document.getElementById('clearbtn').addEventListener('click', clear)
document.getElementById('aothersel').addEventListener('change', event => {
    const isFan = event.target.value === 'fan'
    document.getElementById('fanutils').classList.toggle('hidden', !isFan)
    document.getElementById('tcanutils').classList.toggle('hidden', isFan)
    document.getElementById('fanaddok').textContent = isFan ? 'Place fan' : 'Place trash can'
    setFanPlacementStatus('')
})
document.getElementById('fanaddok').addEventListener('click', () => {
    if (document.getElementById('aothersel').value === 'tcan') startTcanPlacement()
    else startFanPlacement()
})
document.getElementById('add-box').addEventListener('click', ()=>{
    initCb({ x: parseFloat(bxi.value), y: parseFloat(byi.value), z: parseFloat(bzi.value), w: parseFloat(bwidi.value), h: parseFloat(bheii.value), d: parseFloat(bdepi.value), mass: parseFloat(bwidi.value)*parseFloat(bheii.value)*parseFloat(bdepi.value), fixed: fchkbx.checked, color:parseInt(clrinp.value.replace('#', ''), 16) })
})
document.getElementById('modetrans').addEventListener('click', ()=>{
    transformControls.setMode('translate')
})
document.getElementById('modescale').addEventListener('click', ()=>{
    if (groupActive()) {
        setGroupInfo("Scale only works on a single object.", true)
        $('modetrans').click()
        return
    }
    transformControls.setMode('scale')
})
document.getElementById('moderot').addEventListener('click', ()=>{
    transformControls.setMode('rotate')
})
document.getElementById('wbtn').addEventListener('click', ()=>{
    exitGroup()
    welding=true
    transformControls.visible = false
    transformControls.detach(); 
})
fchkbx2.addEventListener("change", ()=>{
    if (groupActive()) { setGroupFixed(fchkbx2.checked); return }
    //let selectedObject = { type: 'box', index: 0 }
    switch(selectedObject.type){
        case 'box':
            if (engine.rigidbodies.length < selectedObject.index+1) return
            engine.rigidbodies[selectedObject.index].f=fchkbx2.checked
            selectedObject.fxd = fchkbx2.checked
            break
        case 'ball':
            if (engine.objs.length < selectedObject.index+1) return
            engine.objs[selectedObject.index].f=fchkbx2.checked
            selectedObject.fxd = fchkbx2.checked
            break
    }
})

function updProps(){
    if (groupActive()) { updGroupProps(); return }
    if (fchkbx2.indeterminate) fchkbx2.indeterminate = false
    const typ = selectedObject.type
    const ind = selectedObject.index
    const rb = engine.rigidbodies
    const bs = engine.objs
    const hasSelection = typ === 'box' ? ind < rb.length : typ === 'ball' ? ind < bs.length : false
    if (!hasSelection) {
        $("bxip").readOnly = true
        $("byip").readOnly = true
        $("bzip").readOnly = true
        $("bclr2").readOnly = true
        return
    }
    if (!paused){
        fchkbx2.checked = typ=="box" ? rb[ind].f : bs[ind].f
        $("bxip").value = typ=="box" ? rb[ind].cx.toFixed(3) : bs[ind].p.x.toFixed(3)
        $("byip").value = typ=="box" ? rb[ind].cy.toFixed(3) : bs[ind].p.y.toFixed(3)
        $("bzip").value = typ=="box" ? rb[ind].cz.toFixed(3) : bs[ind].p.z.toFixed(3)
        $("brp").value = typ=="box" ? 0 : bs[ind].r
        $("bclr2").value = typ=="box" ? "#"+rb[ind].color.toString(16).slice(-6) : rgbToHex2(balls[ind].mesh.material.color.r,balls[ind].mesh.material.color.g,balls[ind].mesh.material.color.b)
        $("bmp").value = typ=="box" ? 0 : bs[ind].m.toFixed(3)
    }
    const fxd =  typ=="box" ? rb[ind].f : bs[ind].f
    if (paused || fxd){
        $("bxip").readOnly=false
        $("byip").readOnly=false
        $("bzip").readOnly=false
        $("bclr2").readOnly=false
    } else {
        $("bxip").readOnly=true
        $("byip").readOnly=true
        $("bzip").readOnly=true
        $("bclr2").readOnly=true
    }
    if (typ == "box"){
        $("brp").parentElement.style.display="none"
        $("bmp").parentElement.style.display="none"
    } else {

        $("brp").parentElement.style.display="flex"
        $("bmp").parentElement.style.display="flex"
    }
}
$("bxip").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        const bs = engine.objs
        if (typ == "box"){
            if (engine.rigidbodies.length < ind+1) return
            const part = cubeParts[ind]
            const rb = part.body
            const pc = partCenter(part)
            
            const dx = this.value - pc.x
            if (dx !== 0) {
                for (const point of rb.pts) {
                    point.p.x += dx
                    point.pp.x += dx
                }
            }
        } 
        if (typ == "ball"){
            if (engine.objs.length < ind+1) return
            bs[ind].p.x = this.value
            bs[ind].pp.x = this.value
        }
    }
})
$("byip").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        const bs = engine.objs
        if (typ == "box"){
            if (engine.rigidbodies.length < ind+1) return
            const part = cubeParts[ind]
            const rb = part.body
            const pc = partCenter(part)
            
            const dy = this.value - pc.y
            if (dy !== 0) {
                for (const point of rb.pts) {
                    point.p.y += dy
                    point.pp.y += dy
                }
            }
        } 
        if (typ == "ball"){
            if (engine.objs.length < ind + 1) return
            bs[ind].p.y = this.value
            bs[ind].pp.y = this.value
        }
    }
})
$("bzip").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        const bs = engine.objs
        if (typ == "box"){
            if (engine.rigidbodies.length < ind+1) return
            const part = cubeParts[ind]
            const rb = part.body
            const pc = partCenter(part)
            
            const dz = this.value - pc.z
            if (dz !== 0) {
                for (const point of rb.pts) {
                    point.p.z += dz
                    point.pp.z += dz
                }
            }
        } 
        if (typ == "ball"){
            if (engine.objs.length < ind + 1) return
            bs[ind].p.z = this.value
            bs[ind].pp.z = this.value
        }
    }
})
$("brp").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        const bs = engine.objs
        if (typ == "ball"){
            if (engine.objs.length < ind + 1) return
            const lr = bs[ind].r
            const mesh = balls[ind].mesh
            bs[ind].r = parseFloat(this.value)
            mesh.scale.copy(new THREE.Vector3(this.value/lr,this.value/lr,this.value/lr))
        }
    }
})
$("bclr2").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        if (typ=="box"){
            if (engine.rigidbodies.length < ind+1) return
            cubes[ind].material.color.set(this.value)
            engine.rigidbodies[ind].color = parseInt(this.value.substr(1), 16)
        }
        if (typ=="ball"){
            if (engine.objs.length < ind + 1) return
            balls[ind].mesh.material.color.set(this.value)
        }
    }
})
$("bmp").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        if (typ=="ball"){
            if (engine.objs.length < ind + 1) return
            balls[ind].body.m=parseFloat(this.value)
        }
    }
})
$("pauplaybtn").addEventListener("click", ()=>{
    paused = !paused
    $("pauplaybtn").style.backgroundColor = paused ? "#7d7d7d" : "#282828"
})
$("cbalsbtn").addEventListener("click", ()=>{
    clearB()
})
$("rszbtn").addEventListener("click", ()=>{

    const winp = parseFloat($('wwid').value)
    const hinp = parseFloat($('whei').value)
    const dinp = parseFloat($('wdep').value)
    const walls = [-winp*0.5, -hinp*0.5,winp*0.5, hinp*0.5,-dinp*0.5, dinp*0.5]
    engine.walls=walls
    ggeo = new THREE.BoxGeometry(winp, 1, dinp)
    ggeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    gcube.geometry=ggeo
    gcube.position.set(0, -hinp*0.5, 0)
    grid.position.y = -hinp*0.5+1
    closePopup("popup")
})
$("delbtn").addEventListener("click", delCur)
$("dnldbtn").addEventListener("click", ()=>{
    const name = $("fnam").value
    const data = pack(engine)
    download(data, name)
    $("download").style.display="none"
    alert("Downloading...")
})
$("impbtn").addEventListener("click", async ()=>{
    const inp = $("fimport")
    const files = inp.files
    if (files.length == 0){
        $("info").style.color=errclr
        $("info").innerText="No input files."
        return
    }
    const firstfile = files[0]
    const textData = await firstfile.text()
    const data = JSON.parse(textData)
    exitGroup()
    unpack(data, engine, cubes, balls, VCMs, cubeParts, fanVisuals, tcanVisuals, scene, storedFanMdl, storedTcanMdl)
    scene.add(transformControls.getHelper())
    if (cubes.length) {
        selectedObject = { type: 'box', index: 0, fxd: engine.rigidbodies[0].f }
        transformControls.attach(cubes[0])
    } else if (balls.length) {
        selectedObject = { type: 'ball', index: 0, fxd: engine.objs[0].f }
        transformControls.attach(balls[0].mesh)
    } else if (fanVisuals.length) {
        selectedObject = { type: 'fan', index: 0, fxd: true }
        transformControls.attach(fanVisuals[0])
    } else if (tcanVisuals.length) {
        selectedObject = { type: 'tcan', index: 0, fxd: true }
        transformControls.attach(tcanVisuals[0].mesh)
    } else {
        selectedObject = { type: 'none', index: -1, fxd: false }
        transformControls.detach()
    }
    
    $("info").style.color=infoclr
    $("info").innerHTML='<img src="info.svg" class="infoimg">Imported'
})
for (let i = 0; i < 100; i++){
    addBoxRnd()
}

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(cubes[selectedObject.index]);
transformControls.translationSnap = 5
transformControls.rotationSnap = Math.PI / 12 //15 deg
scene.add(transformControls.getHelper())

const GRIDSNAPUNIT = 10.0

transformControls.addEventListener('objectChange', () => {
    const mesh = transformControls.object
    if (!mesh) return
    if (mesh === groupSel.pivot) {
        applyGroupTransform()
        return
    }

    if (selectedObject.type === 'ball') {
        const { body } = balls[selectedObject.index]
        const dx = mesh.position.x - body.p.x
        const dy = mesh.position.y - body.p.y
        const dz = mesh.position.z - body.p.z
        body.p.x += dx; body.pp.x += dx
        body.p.y += dy; body.pp.y += dy
        body.p.z += dz; body.pp.z += dz
        return
    }
    if (selectedObject.type === 'fan') {
        const fan = engine.fans[selectedObject.index]
        if (!fan || fanVisuals[selectedObject.index] !== mesh) return
        fan.pos.x = mesh.position.x
        fan.pos.y = mesh.position.y
        fan.pos.z = mesh.position.z
        const direction = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(mesh.quaternion)
            .normalize()
        fan.dir.x = direction.x
        fan.dir.y = direction.y
        fan.dir.z = direction.z
        return
    }
    if (selectedObject.type === 'tcan') {
        const item = tcanVisuals[selectedObject.index]
        const tcan = engine.tcans[selectedObject.index]
        if (!item || !tcan || item.mesh !== mesh) return
        tcan.pos.x = mesh.position.x
        tcan.pos.y = mesh.position.y + item.size / 2
        tcan.pos.z = mesh.position.z
        return
    }
    if (selectedObject.type === 'adder') return

    const part = cubeParts[selectedObject.index]
    const rb = part.body
    const pc = partCenter(part)
    
    const dx = mesh.position.x - pc.x
    const dy = mesh.position.y - pc.y
    const dz = mesh.position.z - pc.z
    if (dx !== 0 || dy !== 0 || dz !== 0) {
        for (const point of rb.pts) {
            point.p.x += dx; point.p.y += dy; point.p.z += dz
            point.pp.x = point.p.x
            point.pp.y = point.p.y
            point.pp.z = point.p.z
        }
    }

    const previousRotation = mesh.userData.physicsRotation ?? new THREE.Quaternion()
    const nextRotation = mesh.quaternion.clone().normalize()
    const previousScale = mesh.userData.physicsScale ?? new THREE.Vector3(1, 1, 1)
    
    if (!mesh.userData.baseDimensions) {
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        mesh.userData.baseDimensions = new THREE.Vector3(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z
        )
    }
    const baseDim = mesh.userData.baseDimensions;

    const currentSizeX = mesh.scale.x * baseDim.x
    const currentSizeY = mesh.scale.y * baseDim.y
    const currentSizeZ = mesh.scale.z * baseDim.z

    const snappedSizeX = Math.round(currentSizeX / GRIDSNAPUNIT) * GRIDSNAPUNIT
    const snappedSizeY = Math.round(currentSizeY / GRIDSNAPUNIT) * GRIDSNAPUNIT
    const snappedSizeZ = Math.round(currentSizeZ / GRIDSNAPUNIT) * GRIDSNAPUNIT

    const nextScale = new THREE.Vector3(
        Math.max(snappedSizeX / baseDim.x, 0.01),
        Math.max(snappedSizeY / baseDim.y, 0.01),
        Math.max(snappedSizeZ / baseDim.z, 0.01)
    );
    
    mesh.scale.copy(nextScale)

    const sx = nextScale.x / previousScale.x
    const sy = nextScale.y / previousScale.y
    const sz = nextScale.z / previousScale.z
    
    if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6 || Math.abs(sz - 1) > 1e-6) {
        let previousCenterX = 0, previousCenterY = 0, previousCenterZ = 0
        for (const point of part.pts) {
            previousCenterX += point.pp.x
            previousCenterY += point.pp.y
            previousCenterZ += point.pp.z
        }
        previousCenterX /= part.pts.length
        previousCenterY /= part.pts.length
        previousCenterZ /= part.pts.length

        const inverseRotation = nextRotation.clone().invert()
        const scaleRatio = new THREE.Vector3(sx, sy, sz)
        const currentOffset = new THREE.Vector3()
        const previousOffset = new THREE.Vector3()
        
        for (const point of part.pts) {
            currentOffset.set(point.p.x - pc.x, point.p.y - pc.y, point.p.z - pc.z)
                .applyQuaternion(inverseRotation)
                .multiply(scaleRatio)
                .applyQuaternion(nextRotation)
            point.p.x = pc.x + currentOffset.x
            point.p.y = pc.y + currentOffset.y
            point.p.z = pc.z + currentOffset.z
            point.pp.x = point.p.x
            point.pp.y = point.p.y
            point.pp.z = point.p.z
        }
        rb.resetRest()
        previousScale.copy(nextScale)
        mesh.userData.physicsScale = previousScale
    }

    const rotationDelta = nextRotation.clone().multiply(previousRotation.clone().invert())
    if (rotationDelta.angleTo(new THREE.Quaternion()) > 1e-10) {
        let previousCenterX = 0, previousCenterY = 0, previousCenterZ = 0
        for (const point of rb.pts) {
            previousCenterX += point.pp.x
            previousCenterY += point.pp.y
            previousCenterZ += point.pp.z
        }
        previousCenterX /= rb.pts.length
        previousCenterY /= rb.pts.length
        previousCenterZ /= rb.pts.length

        const currentOffset = new THREE.Vector3()
        const previousOffset = new THREE.Vector3()
        for (const point of rb.pts) {
            currentOffset.set(point.p.x - pc.x, point.p.y - pc.y, point.p.z - pc.z)
                .applyQuaternion(rotationDelta)
            point.p.x = pc.x + currentOffset.x
            point.p.y = pc.y + currentOffset.y
            point.p.z = pc.z + currentOffset.z
            point.pp.x = point.p.x
            point.pp.y = point.p.y
            point.pp.z = point.p.z
        }
        previousRotation.copy(nextRotation)
        mesh.userData.physicsRotation = previousRotation
    }
    
    rb.update()
    boxToCube(selectedObject.index)
})
transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value
    if (transformControls.object === groupSel.pivot) {
        if (event.value) beginGroupDrag()
        else endGroupDrag()
    }
})
const groupSel = {
    items: [],
    pivot: new THREE.Object3D(),
    drag: null
}
scene.add(groupSel.pivot)

const gv = new THREE.Vector3()
const gm = new THREE.Matrix4()
const gq = new THREE.Quaternion()
const gq2 = new THREE.Quaternion()
const gbox = new THREE.Box3()

let groupInfoShown = false

const clrCond = (item, wantedColor)=>{
    if (item.type == "box"){
        const color = item.root.material.color.getHexString()
        if (color == wantedColor) return true
    }
    if (item.type == "ball"){
        const color = rgbToHex(...engine.objs[item.index].c)
        if (color == wantedColor) return true
    }
    return false
}

function setGroupInfo(text, isError = false){
    const el = $("info")
    el.style.color = isError ? errclr : infoclr
    el.innerHTML = isError ? '<img src="err.svg" class="infoimg">' : '<img src="info.svg" class="infoimg">' + text
    groupInfoShown = true
}
function clearGroupInfo(){
    if (!groupInfoShown) return
    groupInfoShown = false
    const el = $("info")
    el.style.color = ''
    el.innerText = 'Info'
}

function groupActive(){
    return groupSel.items.length > 0
}
function allItems(){
    const items = []
    for (let i = 0; i < cubes.length; i++) {
        if (!cubeParts[i]) continue
        items.push({ type: 'box', index: i, root: cubes[i], part: cubeParts[i] })
    }
    for (let i = 0; i < balls.length; i++) {
        items.push({ type: 'ball', index: i, root: balls[i].mesh, ball: balls[i] })
    }
    for (let i = 0; i < fanVisuals.length; i++) {
        if (!engine.fans[i]) continue
        items.push({ type: 'fan', index: i, root: fanVisuals[i], fan: engine.fans[i] })
    }
    for (let i = 0; i < tcanVisuals.length; i++) {
        if (!engine.tcans[i]) continue
        items.push({ type: 'tcan', index: i, root: tcanVisuals[i].mesh, tcanItem: tcanVisuals[i], tcan: engine.tcans[i] })
    }
    return items
}

function currentSelectionRoots(){
    if (groupActive()) return groupSel.items.map(it => it.root)
    const { type, index } = selectedObject
    const root = type === 'box' ? cubes[index]
        : type === 'ball' ? balls[index]?.mesh
        : type === 'fan' ? fanVisuals[index]
        : type === 'tcan' ? tcanVisuals[index]?.mesh
        : null
    return root && root.parent && transformControls.object === root ? [root] : []
}

function selectSingle(it){
    const fxd = it.type === 'box' ? it.part.body.f : it.type === 'ball' ? it.ball.body.f : true
    selectedObject = { type: it.type, index: it.index, fxd }
    transformControls.attach(it.root)
}

function selGroup(items){
    if (items.length >= 2) {
        enterGroup(items)
        return
    }
    exitGroup()
    if (items.length === 1) {
        selectSingle(items[0])
    } else {
        transformControls.detach()
        selectedObject = { type: 'none', index: -1, fxd: false }
    }
}
function commitRoots(roots){
    const wanted = new Set(roots)
    const items = allItems().filter(it => wanted.has(it.root))
    selGroup(items)
}
function getGroupWhere(condition){
    return allItems().filter(item => condition(item))
}
function selGroupWhere(condition){
    const items = getGroupWhere(condition)
    selGroup(items)
}
function groupAnchor(it){
    if (it.type === 'box') return partCenter(it.part)
    if (it.type === 'ball') return it.ball.body.p
    return it.root.position
}
function syncGroupPivot(){
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (const it of groupSel.items) {
        const p = groupAnchor(it)
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.z < minZ) minZ = p.z
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
        if (p.z > maxZ) maxZ = p.z
    }
    groupSel.pivot.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
    groupSel.pivot.quaternion.identity()
    groupSel.pivot.scale.set(1, 1, 1)
    groupSel.pivot.updateMatrixWorld(true)
}

function enterGroup(items){
    if (groupSel.drag) endGroupDrag()
    groupSel.items = items
    selectedObject = { type: 'none', index: -1, fxd: false }
    if (transformControls.mode === 'scale') $('modetrans').click()
    syncGroupPivot()
    transformControls.attach(groupSel.pivot)
    outlinePass.selectedObjects = items.map(it => it.root)
    setGroupInfo(`${items.length} objects selected`)
}

function exitGroup(){
    if (!groupActive()) return
    if (groupSel.drag) endGroupDrag()
    groupSel.items = []
    if (transformControls.object === groupSel.pivot) transformControls.detach()
    outlinePass.selectedObjects = []
    clearGroupInfo()
}

function syncGroup(){
    if (!groupActive() || transformControls.dragging) return
    const alive = groupSel.items.filter(it => it.root.parent)
    if (alive.length !== groupSel.items.length) {
        commitRoots(alive.map(it => it.root))
        return
    }
    syncGroupPivot()
}

function beginGroupDrag(){
    groupSel.pivot.updateMatrixWorld(true)
    const d = {
        startInv: groupSel.pivot.matrixWorld.clone().invert(),
        startQ: groupSel.pivot.quaternion.clone(),
        bodies: [], balls: [], fans: [], tcans: [], cubes: []
    }
    const moved = new Set()
    for (const it of groupSel.items) {
        if (it.type === 'box') {
            const body = it.part.body
            if (moved.has(body)) continue
            moved.add(body)
            const pts = body.pts
            const start = new Float64Array(pts.length * 3)
            for (let i = 0; i < pts.length; i++) {
                start[i * 3] = pts[i].p.x
                start[i * 3 + 1] = pts[i].p.y
                start[i * 3 + 2] = pts[i].p.z
            }
            d.bodies.push({ body, start, wasFixed: body.f, q0: body.q ? { ...body.q } : null })
        } else if (it.type === 'ball') {
            const body = it.ball.body
            d.balls.push({ body, start: new THREE.Vector3(body.p.x, body.p.y, body.p.z), wasFixed: body.f })
        } else if (it.type === 'fan') {
            d.fans.push({ fan: it.fan, mesh: it.root, pos: it.root.position.clone(), quat: it.root.quaternion.clone() })
        } else if (it.type === 'tcan') {
            d.tcans.push({ tcan: it.tcan, size: it.tcanItem.size, mesh: it.root, pos: it.root.position.clone() })
        }
    }
    for (let i = 0; i < cubes.length; i++) {
        if (cubeParts[i] && moved.has(cubeParts[i].body)) d.cubes.push({ mesh: cubes[i], quat: cubes[i].quaternion.clone() })
    }
    groupSel.drag = d
    for (const b of d.bodies) b.body.f = true
    for (const b of d.balls) b.body.f = true
}

function applyGroupTransform(){
    const d = groupSel.drag
    if (!d) return
    const pivot = groupSel.pivot
    pivot.scale.set(1, 1, 1)
    pivot.updateMatrixWorld(true)
    gm.multiplyMatrices(pivot.matrixWorld, d.startInv)
    gq.copy(d.startQ).invert().premultiply(pivot.quaternion)

    for (const b of d.bodies) {
        const pts = b.body.pts
        for (let i = 0; i < pts.length; i++) {
            gv.set(b.start[i * 3], b.start[i * 3 + 1], b.start[i * 3 + 2]).applyMatrix4(gm)
            const pt = pts[i]
            pt.p.x = gv.x; pt.p.y = gv.y; pt.p.z = gv.z
            pt.pp.x = gv.x; pt.pp.y = gv.y; pt.pp.z = gv.z
        }
        b.body.f = true
        if (b.q0 && b.body.q) {
            gq2.set(b.q0.x, b.q0.y, b.q0.z, b.q0.w).premultiply(gq)
            b.body.q.w = gq2.w; b.body.q.x = gq2.x; b.body.q.y = gq2.y; b.body.q.z = gq2.z
        }
        b.body.update()
    }
    for (const c of d.cubes) {
        c.mesh.quaternion.copy(c.quat).premultiply(gq)
        c.mesh.userData.physicsRotation = c.mesh.quaternion.clone()
    }
    for (const b of d.balls) {
        gv.copy(b.start).applyMatrix4(gm)
        const body = b.body
        body.p.x = gv.x; body.p.y = gv.y; body.p.z = gv.z
        body.pp.x = gv.x; body.pp.y = gv.y; body.pp.z = gv.z
        body.f = true
    }
    for (const f of d.fans) {
        f.mesh.position.copy(f.pos).applyMatrix4(gm)
        f.mesh.quaternion.copy(f.quat).premultiply(gq)
        f.fan.pos.x = f.mesh.position.x
        f.fan.pos.y = f.mesh.position.y
        f.fan.pos.z = f.mesh.position.z
        gv.set(1, 0, 0).applyQuaternion(f.mesh.quaternion).normalize()
        f.fan.dir.x = gv.x; f.fan.dir.y = gv.y; f.fan.dir.z = gv.z
    }
    for (const t of d.tcans) {
        t.mesh.position.copy(t.pos).applyMatrix4(gm)
        t.tcan.pos.x = t.mesh.position.x
        t.tcan.pos.y = t.mesh.position.y + t.size / 2
        t.tcan.pos.z = t.mesh.position.z
    }
}

function endGroupDrag(){
    const d = groupSel.drag
    if (!d) return
    groupSel.drag = null
    for (const b of d.bodies) b.body.f = b.wasFixed
    for (const b of d.balls) b.body.f = b.wasFixed
    syncGroupPivot()
}

function updGroupProps(){
    for (const id of ["bxip", "byip", "bzip", "bclr2"]) $(id).readOnly = true
    if (groupSel.drag) return
    let fixed = 0, total = 0
    for (const it of groupSel.items) {
        if (it.type !== 'box' && it.type !== 'ball') continue
        total++
        if (it.type === 'box' ? it.part.body.f : it.ball.body.f) fixed++
    }
    fchkbx2.indeterminate = fixed > 0 && fixed < total
    fchkbx2.checked = total > 0 && fixed === total
}
function setGroupFixed(value){
    for (const it of groupSel.items) {
        if (it.type === 'box') it.part.body.f = value
        else if (it.type === 'ball') it.ball.body.f = value
    }
    fchkbx2.indeterminate = false
}

function deleteGroup(){
    const items = groupSel.items.slice()
    exitGroup()
    const bodies = new Set(items.filter(it => it.type === 'box').map(it => it.part.body))
    for (let i = cubes.length - 1; i >= 0; i--) {
        if (!bodies.has(cubeParts[i].body)) continue
        const cube = cubes[i]
        scene.remove(cube)
        if (cube.geometry) cube.geometry.dispose()
        if (cube.material) cube.material.dispose()
        cubes.splice(i, 1)
        VCMs.splice(i, 1)
        cubeParts.splice(i, 1)
    }
    for (const body of bodies) {
        const k = engine.rigidbodies.indexOf(body)
        if (k >= 0) engine.rigidbodies.splice(k, 1)
    }
    const byIndexDesc = (a, b) => b.index - a.index
    for (const it of items.filter(it => it.type === 'ball').sort(byIndexDesc)) {
        const ball = balls[it.index]
        if (!ball) continue
        scene.remove(ball.mesh)
        if (ball.mesh.geometry) ball.mesh.geometry.dispose()
        if (ball.mesh.material) ball.mesh.material.dispose()
        const k = engine.objs.indexOf(ball.body)
        if (k >= 0) engine.objs.splice(k, 1)
        balls.splice(it.index, 1)
    }
    for (const it of items.filter(it => it.type === 'fan').sort(byIndexDesc)) {
        scene.remove(fanVisuals[it.index])
        engine.fans.splice(it.index, 1)
        fanVisuals.splice(it.index, 1)
    }
    for (const it of items.filter(it => it.type === 'tcan').sort(byIndexDesc)) {
        scene.remove(tcanVisuals[it.index].mesh)
        engine.tcans.splice(it.index, 1)
        tcanVisuals.splice(it.index, 1)
    }
    transformControls.detach()
    selectedObject = { type: 'none', index: -1, fxd: false }
}
function dupeMesh(mesh){
    const clone = mesh.clone();
    clone.geometry = mesh.geometry.clone();
    clone.material = mesh.material.clone();
    return clone
}
function cloneSelection(){
    const newS = []
    if (groupSel.length == 1){
        // TODO: add cloning here and under here and the select by color and radius and this and that and that one over there and also that one and this here and
    }
}
const MARQUEEMINPX = 4
const isMarqueeGesture = (event) => event.shiftKey
const marqueeEl = document.createElement('div')
marqueeEl.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:50;box-sizing:border-box;' +
    'border:1px solid white;background:#ffffff00;'
document.body.appendChild(marqueeEl)
let marquee = null

function drawMarquee(){
    const dragged = Math.hypot(marquee.x1 - marquee.x0, marquee.y1 - marquee.y0) >= MARQUEEMINPX
    marqueeEl.style.display = dragged ? 'block' : 'none'
    marqueeEl.style.left = Math.min(marquee.x0, marquee.x1) + 'px'
    marqueeEl.style.top = Math.min(marquee.y0, marquee.y1) + 'px'
    marqueeEl.style.width = Math.abs(marquee.x1 - marquee.x0) + 'px'
    marqueeEl.style.height = Math.abs(marquee.y1 - marquee.y0) + 'px'
}
function endMarqueeUI(pointerId){
    marquee = null
    marqueeEl.style.display = 'none'
    document.body.style.userSelect = ''
    try { renderer.domElement.releasePointerCapture(pointerId) } catch (e) { /* already released */ }
}
function cancelMarquee(){
    if (!marquee) return false
    endMarqueeUI(marquee.id)
    return true
}

function itemScreenRect(it, cr){
    if (it.type === 'ball') {
        const p = it.ball.body.p
        gv.set(p.x, p.y, p.z).applyMatrix4(camera.matrixWorldInverse)
        const depth = -gv.z
        if (depth <= camera.near) return null
        const rad = it.ball.body.r * camera.projectionMatrix.elements[5] / depth * cr.height / 2
        gv.applyMatrix4(camera.projectionMatrix)
        const cx = cr.left + (gv.x * 0.5 + 0.5) * cr.width
        const cy = cr.top + (-gv.y * 0.5 + 0.5) * cr.height
        return { l: cx - rad, r: cx + rad, t: cy - rad, b: cy + rad }
    }
    const pts = []
    if (it.type === 'box') {
        for (const q of it.part.pts) pts.push(q.p)
    } else {
        gbox.setFromObject(it.root)
        if (gbox.isEmpty()) return null
        for (let i = 0; i < 8; i++) {
            pts.push({
                x: i & 1 ? gbox.max.x : gbox.min.x,
                y: i & 2 ? gbox.max.y : gbox.min.y,
                z: i & 4 ? gbox.max.z : gbox.min.z
            })
        }
    }
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
    for (const p of pts) {
        gv.set(p.x, p.y, p.z).applyMatrix4(camera.matrixWorldInverse)
        if (gv.z > -camera.near) continue            // behind the camera
        gv.applyMatrix4(camera.projectionMatrix)
        const sx = cr.left + (gv.x * 0.5 + 0.5) * cr.width
        const sy = cr.top + (-gv.y * 0.5 + 0.5) * cr.height
        if (sx < l) l = sx
        if (sx > r) r = sx
        if (sy < t) t = sy
        if (sy > b) b = sy
    }
    return l === Infinity ? null : { l, r, t, b }
}

function boxSelect(m){
    const sl = Math.min(m.x0, m.x1), sr = Math.max(m.x0, m.x1)
    const st = Math.min(m.y0, m.y1), sb = Math.max(m.y0, m.y1)
    camera.updateMatrixWorld()
    scene.updateMatrixWorld(true)
    const cr = renderer.domElement.getBoundingClientRect()
    const hits = allItems().filter(it => {
        const r = itemScreenRect(it, cr)
        return r && r.r >= sl && r.l <= sr && r.b >= st && r.t <= sb
    })
    const roots = hits.map(it => it.root)
    commitRoots(m.additive ? [...currentSelectionRoots(), ...roots] : roots)
}

function pickItemAt(event){
    const cr = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - cr.left) / cr.width) * 2 - 1
    mouse.y = -((event.clientY - cr.top) / cr.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const items = allItems()
    const hit = raycaster.intersectObjects(items.map(it => it.root), true)[0]
    if (!hit) return null
    return items.find(it => it.root === hit.object || it.root.getObjectById(hit.object.id) === hit.object) ?? null
}
function toggleAt(event){
    const it = pickItemAt(event)
    if (!it) return
    const roots = currentSelectionRoots()
    commitRoots(roots.includes(it.root) ? roots.filter(r => r !== it.root) : [...roots, it.root])
}
window.addEventListener('pointerdown', (event) => {
    if (event.target !== renderer.domElement) return
    if (event.button !== 0 || !event.isPrimary || !isMarqueeGesture(event)) return
    if (fanPlacement || welding) return
    event.preventDefault()
    event.stopPropagation()
    marquee = {
        id: event.pointerId,
        x0: event.clientX, y0: event.clientY, x1: event.clientX, y1: event.clientY,
        additive: event.ctrlKey || event.metaKey
    }
    renderer.domElement.setPointerCapture(event.pointerId)
    document.body.style.userSelect = 'none'
}, true)
renderer.domElement.addEventListener('pointermove', (event) => {
    if (!marquee || event.pointerId !== marquee.id) return
    marquee.x1 = event.clientX
    marquee.y1 = event.clientY
    drawMarquee()
})
renderer.domElement.addEventListener('pointerup', (event) => {
    if (!marquee || event.pointerId !== marquee.id) return
    const m = marquee
    m.x1 = event.clientX
    m.y1 = event.clientY
    endMarqueeUI(event.pointerId)
    if (Math.hypot(m.x1 - m.x0, m.y1 - m.y0) < MARQUEEMINPX) toggleAt(event)
    else boxSelect(m)
})
renderer.domElement.addEventListener('pointercancel', () => { cancelMarquee() })

window.addEventListener('keydown', (event) => {
    if (event.key === 'Shift' && !fanPlacement && !welding) renderer.domElement.style.cursor = 'crosshair'
})
window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') renderer.domElement.style.cursor = ''
})
window.addEventListener('blur', () => { renderer.domElement.style.cursor = '' })

engine.rigidbodies[0].f=true
selectedObject.fxd = true


renderer.domElement.addEventListener('pointerdown', (event) => {
    if (fanPlacement) {
        handleFanPlacementClick(event)
        return
    }

    const canvasBounds = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const selectableMeshes = [...cubes, ...balls.map(ball => ball.mesh), ...fanVisuals, ...tcanVisuals.map(item => item.mesh)]
    if (am) selectableMeshes.push(am)
    const intersects = raycaster.intersectObjects(selectableMeshes, true)
    if (intersects.length > 0) {
        if (transformControls.dragging || intersects[0].object.type === 'TransformControlsPlane') return
        exitGroup()

        const clickedMesh = intersects[0].object
        const meshIndex = cubes.indexOf(clickedMesh)
        const ballIndex = balls.findIndex(ball => ball.mesh === clickedMesh)
        const fanIndex = fanVisuals.findIndex(fanMesh =>
            fanMesh === clickedMesh || fanMesh.getObjectById(clickedMesh.id) === clickedMesh
        )
        const tcanIndex = tcanVisuals.findIndex(item =>
            item.mesh === clickedMesh || item.mesh.getObjectById(clickedMesh.id) === clickedMesh
        )

        if (am && am.getObjectById(clickedMesh.id) === clickedMesh) {
            selectedObject = { type: 'adder', index: 0, fxd: false }
            if (!welding) transformControls.attach(am)
        } else if (meshIndex !== -1) {
            selectedObject = { type: 'box', index: meshIndex, fxd: engine.rigidbodies[meshIndex].f }
            if (!welding) transformControls.attach(clickedMesh)
            if (welding){
                if (sobjn == 0){
                    sobj0 = meshIndex
                    sobjn = 1
                    outlinePass.selectedObjects = [cubes[sobj0]]
                } else {
                    const bodyA = cubeParts[sobj0].body
                    const bodyB = cubeParts[meshIndex].body
                    if (bodyA !== bodyB) engine.weld(bodyA, bodyB)
                    welding = false
                    sobjn = 0

                    tbtns.forEach(btn => btn.classList.remove('active'))
                    tbtns[0].classList.add('active')

                    outlinePass.selectedObjects = [cubes[sobj0], cubes[meshIndex]]
                    setTimeout(() => {
                        outlinePass.selectedObjects = []
                        transformControls.visible = true
                    }, 1000)
                }
            }
        } else if (ballIndex !== -1) {
            selectedObject = { type: 'ball', index: ballIndex, fxd: engine.objs[ballIndex].f }
            transformControls.attach(clickedMesh)
        } else if (fanIndex !== -1) {
            selectedObject = { type: 'fan', index: fanIndex, fxd: true }
            transformControls.attach(fanVisuals[fanIndex])
        } else if (tcanIndex !== -1) {
            selectedObject = { type: 'tcan', index: tcanIndex, fxd: true }
            transformControls.attach(tcanVisuals[tcanIndex].mesh)
        }
    }
})
renderer.domElement.addEventListener('pointermove', (event) => {
    if (!fanPlacement) return
    const originOffset = fanPlacement.type === 'fan' && fanPlacement.stage === 'origin'
        ? Math.max(Number(document.getElementById('frad').value) || 0, 0)
        : 0
    const point = fanPlacementPoint(event, originOffset)
    if (!point) return
    const cursorIndex = fanPlacement.type === 'fan' && fanPlacement.stage === 'direction' ? 1 : 0
    fanPlacement.cursors[cursorIndex].position.copy(point)
})
window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (cancelMarquee()) return
    if (groupActive() && !fanPlacement) {
        exitGroup()
        transformControls.detach()
        selectedObject = { type: 'none', index: -1, fxd: false }
        return
    }
    cancelFanPlacement()
})
function dupeBody(body, offset) {
    const copy = body.clone()

    for (const point of copy.pts) {
        point.p.x += offset.x
        point.p.y += offset.y
        point.p.z += offset.z
        point.pp.x += offset.x
        point.pp.y += offset.y
        point.pp.z += offset.z
    }

    engine.rigidbodies.push(copy)

    for (let i = 0; i < body.parts.length; i++) {
        const part = body.parts[i]
        const meshIndex = cubeParts.findIndex(item => item === part)
        if (meshIndex < 0) continue

        const mesh = dupeMesh(cubes[meshIndex])
        mesh.position.add(new THREE.Vector3(offset.x, offset.y, offset.z))
        scene.add(mesh)

        cubes.push(mesh)
        cubeParts.push(copy.parts[i])
        VCMs.push(VCMs[meshIndex].slice())
    }
}
function dupeBall(ball, meshIndex, offset) {
    const copy = ball.clone()

    ball.p = addVec3(ball.p,offset)
    ball.pp = addVec3(ball.pp, offset)
    engine.objs.push(copy)
    const mesh = dupeMesh(balls[meshIndex].mesh)
    mesh.position.add(new THREE.Vector3(offset.x, offset.y, offset.z))
    scene.add(mesh)

    balls.push({mesh, body:copy})
}
window.addEventListener("keydown", (e)=>{
    if (e.key == "d" && (e.ctrlKey || e.metaKey)){
        e.preventDefault()
        let selAmt = groupSel.items.length
        if (selAmt == 0){
            if (selectedObject.type == "none") return
            selAmt = 1
        }
        const selected = selAmt == 1 ? [selectedObject] : groupSel.items
        selected.forEach(sel=>{
            switch(sel.type){
                case "box":
                    const rb = engine.rigidbodies[sel.index]
                    const clonerb = dupeBody(rb, cloneOffset)
                    break
                case "ball":
                    const ob = engine.objs[sel.index]
                    const cloneba = dupeBall(ob,sel.index, cloneOffset)
                    break

            }
        })
    }
})
function processTcanCaptures(){
    const removed = engine.doTcans()
    if (!removed) return

    for (const index of removed.dIndsO) {
        const item = balls[index]
        if (!item) continue
        scene.remove(item.mesh)
        item.mesh.geometry.dispose()
        item.mesh.material.dispose()
        balls.splice(index, 1)
    }
    for (const index of removed.dIndsR) {
        const mesh = cubes[index]
        if (!mesh) continue
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
        cubes.splice(index, 1)
        VCMs.splice(index, 1)
        cubeParts.splice(index, 1)
    }

    if (removed.dIndsO.length || removed.dIndsR.length) {
        exitGroup()
        transformControls.detach()
        if (engine.rigidbodies.length) {
            selectedObject = { type: 'box', index: 0, fxd: engine.rigidbodies[0].f }
        } else if (engine.objs.length) {
            selectedObject = { type: 'ball', index: 0, fxd: engine.objs[0].f }
        } else if (engine.fans.length) {
            selectedObject = { type: 'fan', index: 0, fxd: true }
        } else if (engine.tcans.length) {
            selectedObject = { type: 'tcan', index: 0, fxd: true }
        } else {
            selectedObject = { type: 'none', index: -1, fxd: false }
        }
    }
}
function updateSize(newWidth, newHeight){
    renderer.setSize(newWidth, newHeight)
    camera.aspect = newWidth / newHeight
    camera.updateProjectionMatrix();
}
window.addEventListener("resize", e=>{
    const br = renderer.domElement.getBoundingClientRect()
    updateSize(br.width, br.height)
})
const br = renderer.domElement.getBoundingClientRect()
updateSize(br.width, br.height)
ggeo = new THREE.BoxGeometry(400, 1, 400)
ggeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
const gmaterial = new THREE.MeshStandardMaterial({
    color: 0x999999,
    roughness: 0.72
})
gcube = new THREE.Mesh(ggeo, gmaterial)
gcube.castShadow = true
gcube.receiveShadow = true
gcube.position.set(0, -200, 0)
scene.add(gcube)
function render() {
    const typ = selectedObject.type
    const ind = selectedObject.index
    if (transformControls.dragging){
        if (typ == "box" && ind < engine.rigidbodies.length){
            engine.rigidbodies[ind].f=true
        }
        if (typ=="ball" && ind < engine.objs.length){
            engine.objs[ind].f=true
        }
    } else {
        if (typ == "box" && ind < engine.rigidbodies.length){
            engine.rigidbodies[ind].f=selectedObject.fxd
        }
        if (typ=="ball" && ind < engine.objs.length){
            engine.objs[ind].f=selectedObject.fxd
        }
    }
    if (!paused){
        engine.step()
        engine.collideAllBalls()
        processTcanCaptures()
    }
    boxToCubeALL()
    for (const { body, mesh } of balls) {
        mesh.position.set(body.p.x, body.p.y, body.p.z)
    }
    syncGroup()
    updateFanAirVisual()
    controls.update()
    renderPipeline.render()
    requestAnimationFrame(render)
}
setInterval(updProps,100)
render()