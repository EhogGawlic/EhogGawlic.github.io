const hiddenGlCanv = getEl("glCanv")
/**
 * @type {WebGL2RenderingContext} gl
 */
const gl = hiddenGlCanv.getContext("webgl2", { 
    premultipliedAlpha: false,
    alpha: false 
})
hiddenGlCanv.width=canvas.width
hiddenGlCanv.height=canvas.height
hiddenGlCanv.style.width=canvas.style.width
hiddenGlCanv.style.height=canvas.style.height
//hey look; if you see no semicolons, it's my code

let glThings = {
    vshader: null,
    fshader: null,
    program: null
}
let instanceBuffer = null
let glReady = false

async function initWebGL() {
    if (!gl) {
        alert("WebGL 2 is not available in your browser.")
        alert("Please use a browser that supports WebGL2.")
        return
    }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0.5, 0.5, 0.5, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    const vShaderSource = await fetch("./vertex.glsl").then(r => r.text())
    const fShaderSource = await fetch("./fragment.glsl").then(r => r.text())
    console.log(vShaderSource, fShaderSource)
    glThings.vshader = gl.createShader(gl.VERTEX_SHADER)
    glThings.fshader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(glThings.vshader, vShaderSource)
    gl.shaderSource(glThings.fshader, fShaderSource)
    gl.compileShader(glThings.vshader)
    gl.compileShader(glThings.fshader)
    if (!gl.getShaderParameter(glThings.vshader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(glThings.vshader))
    }
    if (!gl.getShaderParameter(glThings.fshader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(glThings.fshader))
    }
    glThings.program = gl.createProgram()
    gl.attachShader(glThings.program,glThings.vshader)
    gl.attachShader(glThings.program,glThings.fshader)
    gl.linkProgram(glThings.program)
    if (!gl.getProgramParameter(glThings.program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(glThings.program))
    }
    gl.useProgram(glThings.program)
    gl.uniform2f(
        gl.getUniformLocation(glThings.program, "u_resolution"),
        hiddenGlCanv.width,
        hiddenGlCanv.height
    )

    //this is for drawing circles so we add the big quad thing

    const quadBufData = new Float32Array([
        -1.0, -1.0,   1.0, -1.0,  -1.0,  1.0,
        -1.0,  1.0,   1.0, -1.0,   1.0,  1.0,
    ])

    const quadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, quadBufData, gl.STATIC_DRAW)
    
    const quadPos = gl.getAttribLocation(glThings.program, "a_quad_pos");
    gl.enableVertexAttribArray(quadPos);
    gl.vertexAttribPointer(quadPos, 2, gl.FLOAT, false, 0, 0);

    instanceBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
    initAttribPtrs()
    glReady = true
}
function genBallData(ballz){ // *clears throat*
    let data = new Float32Array(ballz.length*12) // 12 is stride (floats/ball): pos X, pos Y, radius, RGBA, RGBA (outline), outline thickness
    for (let i = 0; i < ballz.length; i++){
        const ptr = i*12
        data[ptr] = ballz[i].p.x
        data[ptr+1] = ballz[i].p.y
        data[ptr+2] = ballz[i].r * (ballz[i].liquid ? 1.5 : 1)
        data[ptr+3] = ballz[i].c[0] / 255
        data[ptr+4] = ballz[i].c[1] / 255
        data[ptr+5] = ballz[i].c[2] / 255
        data[ptr+6] = 1
        if (ballz[i].liquid){
            data[ptr+7] = ballz[i].c[0] / 255
            data[ptr+8] = ballz[i].c[1] / 255
            data[ptr+9] = ballz[i].c[2] / 255
            data[ptr+10] = 0.6
            data[ptr+11] = 0.5
        } else {
            data[ptr+7] = 0
            data[ptr+8] = 0
            data[ptr+9] = 0
            data[ptr+10] = 1
            data[ptr+11] = 0.05
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)

}
function initAttribPtrs(){
    const floatSz = 4;

    const ballPosPtr = gl.getAttribLocation(glThings.program, "a_pos")
    gl.enableVertexAttribArray(ballPosPtr)
    gl.vertexAttribPointer(ballPosPtr, 2, gl.FLOAT, false, 12 * floatSz, 0)
    gl.vertexAttribDivisor(ballPosPtr, 1)

    const ballRadPtr = gl.getAttribLocation(glThings.program, "a_rad")
    gl.enableVertexAttribArray(ballRadPtr)
    gl.vertexAttribPointer(ballRadPtr, 1, gl.FLOAT, false, 12 * floatSz, 2 * floatSz)
    gl.vertexAttribDivisor(ballRadPtr, 1)

    const ballClrPtr = gl.getAttribLocation(glThings.program, "a_color")
    gl.enableVertexAttribArray(ballClrPtr)
    gl.vertexAttribPointer(ballClrPtr, 4, gl.FLOAT, false, 12 * floatSz, 3 * floatSz)
    gl.vertexAttribDivisor(ballClrPtr, 1)

    const ballOutlinePtr = gl.getAttribLocation(glThings.program, "a_outline")
    gl.enableVertexAttribArray(ballOutlinePtr)
    gl.vertexAttribPointer(ballOutlinePtr, 4, gl.FLOAT, false, 12 * floatSz, 7 * floatSz)
    gl.vertexAttribDivisor(ballOutlinePtr, 1)

    const ballEdgePtr = gl.getAttribLocation(glThings.program, "a_edge")
    gl.enableVertexAttribArray(ballEdgePtr)
    gl.vertexAttribPointer(ballEdgePtr, 1, gl.FLOAT, false, 12 * floatSz, 11 * floatSz)
    gl.vertexAttribDivisor(ballEdgePtr, 1)
}
function renderAllBalls(){
    if (!glReady) return
    genBallData(objs) // idk how fast this is, but... all the balls are moving
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, objs.length)
}
initWebGL().catch(error => console.error("WebGL initialization failed:", error))