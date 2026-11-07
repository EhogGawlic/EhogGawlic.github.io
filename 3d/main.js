const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

import * as THREE from "three/webgpu"
//import {Engine} from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@05a3e12f29d038a169424a209c19fcda0a24ad3a/main.js"
import {Engine} from "./fizks/main.js"
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
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
const grid = new THREE.GridHelper(800, 40, 0xff0000, 0xffffff)
grid.position.y = -199.2
scene.add(grid)
cubes = []
let VCMs = []
let cubeParts = []
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
    transformControls.setMode('scale')
})
document.getElementById('moderot').addEventListener('click', ()=>{
    transformControls.setMode('rotate')
})
document.getElementById('wbtn').addEventListener('click', ()=>{
    welding=true
    transformControls.visible = false
    transformControls.detach(); 
})
fchkbx2.addEventListener("change", ()=>{
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
    closePopup()
})
$("delbtn").addEventListener("click", delCur)
for (let i = 0; i < 100; i++){
    addBoxRnd()
}

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(cubes[selectedObject.index]);
transformControls.translationSnap = 5
transformControls.rotationSnap = Math.PI / 12 //15 deg
scene.add(transformControls.getHelper())

const GRID_SNAP_UNIT = 10.0

transformControls.addEventListener('objectChange', () => {
    const mesh = transformControls.object
    if (!mesh) return

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

    const snappedSizeX = Math.round(currentSizeX / GRID_SNAP_UNIT) * GRID_SNAP_UNIT
    const snappedSizeY = Math.round(currentSizeY / GRID_SNAP_UNIT) * GRID_SNAP_UNIT
    const snappedSizeZ = Math.round(currentSizeZ / GRID_SNAP_UNIT) * GRID_SNAP_UNIT

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
})
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
    if (event.key === 'Escape') cancelFanPlacement()
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
    updateFanAirVisual()
    controls.update()
    renderPipeline.render()
    requestAnimationFrame(render)
}
setInterval(updProps,100)
render()
