const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

import * as THREE from "three/webgpu"
import {Engine} from "https://cdn.jsdelivr.net/gh/EhogGawlic/3d-physics-lib@latest/main.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const loader = new GLTFLoader()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

let selectedObject = { type: 'box', index: 0 }
let welding = false
let sobj0,sobjn=0
const BOX = { x0: -200, y0: -200, x1: 200, y1: 200, z0: -200, z1: 200 }
const engine = new Engine({
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
let cubes = []
let VCMs = []
let cubeParts = []
let balls = []
const controls = new OrbitControls( camera, renderer.domElement )
camera.position.set( 0, 20, 100 )
controls.update()
let am
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
function clear(){
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
    selectedObject = { type: 'box', index: 0 }
    const ggeo = new THREE.BoxGeometry(400, 1, 400)
    ggeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    const gmaterial = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.72
    })
    const gcube = new THREE.Mesh(ggeo, gmaterial)
    gcube.castShadow = true
    gcube.receiveShadow = true
    gcube.position.set(0, -200, 0)
    scene.add(gcube)
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
    selectedObject = { type: 'box', index: 0 }
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
})
fchkbx2.addEventListener("change", ()=>{
    //let selectedObject = { type: 'box', index: 0 }
    switch(selectedObject.type){
        case 'box':
            engine.rigidbodies[selectedObject.index].f=fchkbx2.checked
            break
        case 'ball':
            engine.objs[selectedObject.index].f=fchkbx2.checked
            break
    }
})
//ykw?
const $ = document.getElementById.bind(document)

function updProps(){
    const typ = selectedObject.type
    const ind = selectedObject.index
    const rb = engine.rigidbodies
    const bs = engine.objs
    if (!paused){
        fchkbx2.checked = typ=="box" ? rb[ind].f : bs[ind].f
        $("bxip").value = typ=="box" ? rb[ind].cx.toFixed(3) : bs[ind].p.x.toFixed(3)
        $("byip").value = typ=="box" ? rb[ind].cy.toFixed(3) : bs[ind].p.y.toFixed(3)
        $("bzip").value = typ=="box" ? rb[ind].cz.toFixed(3) : bs[ind].p.z.toFixed(3)
        $("brp").value = typ=="box" ? 0 : bs[ind].r
        $("bclr2").value = typ=="box" ? rb[ind].color : rgbToHex(...bs[ind].c)
        $("bmp").value = typ=="box" ? rb[ind].mass : bs[ind].m.toFixed(3)
    }
    if (!paused){
        $("bxip").readOnly=true
        $("byip").readOnly=true
        $("bzip").readOnly=true
        $("brp").readOnly=true
        $("bclr2").readOnly=true
        $("bmp").readOnly=true
    } else {
        $("bxip").readOnly=false
        $("byip").readOnly=false
        $("bzip").readOnly=false
        $("brp").readOnly=false
        $("bclr2").readOnly=false
        $("bmp").readOnly=false
    }
}
$("bxip").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        const bs = engine.objs
        if (typ == "box"){
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
            cubes[ind].material.color.set(this.value)
        }
        if (typ=="ball"){
            balls[ind].mesh.material.color.set(this.value)
        }
    }
})
$("bmp").addEventListener("change", function(e){
    if (!this.readOnly){
        const typ = selectedObject.type
        const ind = selectedObject.index
        if (typ=="ball"){
            balls[ind].body.m=parseFloat(this.value)
        }
    }
})
$("pauplaybtn").addEventListener("click", ()=>{
    paused = !paused
    $("pauplaybtn").style.backgroundColor = paused ? "#820000" : "#118200"
})
$("cbalsbtn").addEventListener("click", ()=>{
    clearB()
})
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
            point.pp.x += dx; point.pp.y += dy; point.pp.z += dz
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

            previousOffset.set(point.pp.x - previousCenterX, point.pp.y - previousCenterY, point.pp.z - previousCenterZ)
                .applyQuaternion(inverseRotation)
                .multiply(scaleRatio)
                .applyQuaternion(nextRotation)
            point.pp.x = previousCenterX + previousOffset.x
            point.pp.y = previousCenterY + previousOffset.y
            point.pp.z = previousCenterZ + previousOffset.z
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

            previousOffset.set(point.pp.x - previousCenterX, point.pp.y - previousCenterY, point.pp.z - previousCenterZ)
                .applyQuaternion(rotationDelta)
            point.pp.x = previousCenterX + previousOffset.x
            point.pp.y = previousCenterY + previousOffset.y
            point.pp.z = previousCenterZ + previousOffset.z
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


renderer.domElement.addEventListener('pointerdown', (event) => {
    const canvasBounds = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const selectableMeshes = [...cubes, ...balls.map(ball => ball.mesh)]
    if (am) selectableMeshes.push(am)
    const intersects = raycaster.intersectObjects(selectableMeshes, true)
    if (intersects.length > 0) {
        if (transformControls.dragging || intersects[0].object.type === 'TransformControlsPlane') return

        const clickedMesh = intersects[0].object
        const meshIndex = cubes.indexOf(clickedMesh)
        const ballIndex = balls.findIndex(ball => ball.mesh === clickedMesh)

        if (am && am.getObjectById(clickedMesh.id) === clickedMesh) {
            selectedObject = { type: 'adder', index: 0 }
            transformControls.attach(am)
        } else if (meshIndex !== -1) {
            selectedObject = { type: 'box', index: meshIndex }
            transformControls.attach(clickedMesh)
            if (welding){
                if (sobjn == 0){
                    sobj0 = meshIndex
                    sobjn = 1
                } else {
                    const bodyA = cubeParts[sobj0].body
                    const bodyB = cubeParts[meshIndex].body
                    if (bodyA !== bodyB) engine.weld(bodyA, bodyB)
                    welding=false
                    sobjn=0
                }
            }
        } else if (ballIndex !== -1) {
            selectedObject = { type: 'ball', index: ballIndex }
            transformControls.attach(clickedMesh)
        }
    }
})
function updateSize(newWidth, newHeight){
    renderer.setSize(newWidth, newHeight)
    camera.aspect = newWidth / newHeight
    camera.updateProjectionMatrix();
}
addEventListener("resize", e=>{
    const br = renderer.domElement.getBoundingClientRect()
    updateSize(br.width, br.height)
})
const br = renderer.domElement.getBoundingClientRect()
updateSize(br.width, br.height)
const ggeo = new THREE.BoxGeometry(400, 1, 400)
ggeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
const gmaterial = new THREE.MeshStandardMaterial({
    color: 0x999999,
    roughness: 0.72
})
const gcube = new THREE.Mesh(ggeo, gmaterial)
gcube.castShadow = true
gcube.receiveShadow = true
gcube.position.set(0, -200, 0)
scene.add(gcube)
function render() {
    if (!paused){
        engine.step()
        engine.collideAllBalls()
    }
    boxToCubeALL()
    for (const { body, mesh } of balls) {
        mesh.position.set(body.p.x, body.p.y, body.p.z)
    }
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(render)
}
setInterval(updProps,100)
render()
