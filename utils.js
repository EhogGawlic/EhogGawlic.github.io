let meterPixRatio = innerHeight/500
let targetRate=250
const filterS = 10
let frameTime = 0, lastLoop = Date.now(), thisLoop, fps, pfps
let fric = 1.001
let objs = [],
    polys= []
let selecting = false
let selected
let lines = [],
    consolehist = [],
    flipP=[],
    flipR=[],
    flipW=[],
    cellsize = 4,
    ltype=0,
    cres=20,
    loading=true,
    grav = 9.8,
    saved,
    cn = 0,
    c1p,
    c2p,
    ml = false,
    valves = [],
    cv = false,
    paused = false,
    sil = false,
    sobjs = [],
    slines=[],
    av=false,
    mx,
    my,
    mol = false,
    clicking=false,
    fans=[],
    af=false,
    fp = {x:0,y:0},
    infspace=false,
    liq = false,
    selecttype = "none",
    deleting=false,
    tcans=[],
    adding={ia:false,t:0},
    cc,
    cs,
    fliprows = 500/cellsize+1,
    flipcols = fliprows+1
for (let y = 0; y < fliprows; y++){
    flipP.push([])
    for (let x = 0; x < flipcols; x++){
        flipP[y].push({x:null,y:null})
    }
}
for (let y = 0; y < fliprows; y++){
    flipR.push([])
    for (let x = 0; x < flipcols; x++){
        flipR[y].push({x:null,y:null})
    }
}
for (let y = 0; y < fliprows; y++){
    flipW.push([])
    for (let x = 0; x < flipcols; x++){
        flipW[y].push({w1:null,w2:null,w3:null,w4:null})
    }
}

const hRGBa = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"a":10,"b":11,"c":12,"d":13,"e":14,"f":15}
const rHEXa = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"]
function loadJSON(files){
    const reader = new FileReader()
    reader.onload = (e)=>{
        return JSON.parse(e.target.result)
    }
    reader.readAsText(files[0])
}

function HEXRGB(from){
    let c = [0,0,0]
    c[0]=hRGBa[from.charAt(1)]*16
    c[0]+=hRGBa[from.charAt(2)]
    c[1]=hRGBa[from.charAt(3)]*16
    c[1]+=hRGBa[from.charAt(4)]
    c[2]=hRGBa[from.charAt(5)]*16
    c[2]+=hRGBa[from.charAt(6)]
    
    return c
}
function imgSrc(url){
    const srcimg = document.createElement("img")
    srcimg.src=url
    srcimg.style.display="none"
    return srcimg
}
function selectBall(x, y){
    for (let i = 0; i < objs.length; i++){
        if (dist({x, y}, objs[i].p) <= objs[i].r){
            return i
        }
    }
    return undefined 
    
}
function selectValve(x, y){
    for (let i = 0; i < valves.length; i++){
        if (dist({x, y}, valves[i].p) <= valves[i].r){
            return i
        }
    }
    return undefined 
    
}
function selectFan(x, y){
    for (let i = 0; i < fans.length; i++){
        if (dist({x, y}, fans[i].p) <= 20){
            return i
        }
    }
    return undefined
    
}
function selectTCan(x, y){
    for (let i = 0; i < tcans.length; i++){
        if (dist({x, y}, tcans[i]) <= 64){
            return i
        }
    }
    return undefined
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
function addLine(w){
    lines.push({p1:c1p,p2:c2p,w:w, m:{h:false,p:{x:0,y:0},t:0},np1:c1p,np2:c2p,s:0.05})
    lninp.max=lines.length-1
    cn=0
    ml =false
}
function dist(v1, v2){
    return Math.sqrt((v1.x-v2.x)**2+(v1.y-v2.y)**2)
}
function LD(v1, v2){
    return (v1.x-v2.x)**2+(v1.y-v2.y)**2
}
function linePoint(p1, p2, p) {

    // get distance from the point to the two ends of the line
    const d1 = dist(p, p1);
    const d2 = dist(p, p2);
  
    // get the length of the line
    const lineLen = dist(p1, p2);
  
    // since floats are so minutely accurate, add
    // a little buffer zone that will give collision
    const b = 0.1;    // higher # = less accurate
  
    // if the two distances are equal to the line's
    // length, the point is on the line!
    // note we use the buffer here to give a range,
    // rather than one #
    if (d1+d2 >= lineLen-b && d1+d2 <= lineLen+b) {
        return "EE"
    }
    if (d1<=d2){
        return p1
    } else {
        return p2
    }
}
function snapLines(x, y){
    //if(slines.checked){
        let snapx = x
        let snapy = y
        lines.forEach(line =>{

            let npl = linePoint(line.p1, line.p2, {x,y})
            if (npl === "EE"){

                
                const d = ( ((x-line.p1.x)*(line.p2.x-line.p1.x)) + ((y-line.p1.y)*(line.p2.y-line.p1.y)) ) / dist(line.p1, line.p2)**2;
                let cx = line.p1.x + (d * (line.p2.x-line.p1.x))
                let cy = line.p1.y + (d * (line.p2.y-line.p1.y))
                npl = {x:cx,y:cy}
            }
            if (dist(npl, {x,y}) <= Math.max(line.w/2, 10)){

                snapx = npl.x
                snapy = npl.y
            }
            if (dist(line.p1, {x,y})<=Math.max(line.w/2, 20)){
                snapx = line.p1.x
                snapy = line.p1.y
            }
            if (dist(line.p2, {x,y})<=Math.max(line.w/2, 20)){
                snapx = line.p2.x
                snapy = line.p2.y
            }
        })
        return {x:snapx,y:snapy}
    //}else{return{x,y}}
}
function cpol(l,p){
    const x1 = l.p1.x
    const x2 = l.p2.x
    const y1 = l.p1.y
    const y2 =l.p2.y
    const d = ( ((p.x-x1)*(x2-x1)) + ((p.y-y1)*(y2-y1)) ) / dist(v1, v2)**2;
    let cx = x1 + (d * (x2-x1))
    let cy = y1 + (d * (y2-y1))
    
    const os = linePoint(v1, v2, {x:cx,y:cy})
    if (os !== "EE"){
        cx = os.x
        cy = os.y
    }
    return {x:cx,y:cy}
}
function selectLine(x, y){
    let i = 0
    lines.forEach(line =>{
        let c = cpol(line, {x,y})
        if (dist(c, {x,y}) <= line.w){
            alert(dist(c,{x,y}))
            return i
        }
        i++
    })
    return undefined
}
function select(x, y){
    const bs = selectBall(x, y)
    const ls = selectLine(x, y)
    if (bs!==undefined){
        sil = false
        return bs
    }
    if (ls!==undefined){
        if (bs===undefined){
            sil = true
            return ls
        } else {
            sil = false
            return bs
        }
    }
    return false
}
function selectLinePoint(x,y){
    let i = 0
    let ns = []
    lines.forEach(l => {
        if (dist(l.p1, {x,y})<=Math.max(l.w, 10)){
            ns.push({n:i,pn:0})
        }
        if (dist(l.p2, {x,y})<=Math.max(l.w, 10)){
            ns.push({n:i,pn:1})
        }
        i++
    })
    return ns
}
const getAngle = function(v){
    return Math.atan2(v.y,v.x)
}
function drawImage(image, x, y, scale, rotation){
    ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
    ctx.rotate(rotation);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.setTransform(1,0,0,1,0,0)
} 
function drawFan(fan){
    const a = getAngle(fan.dir)+1.57079633
    drawImage(t%2===0?fan1:fan2,fan.p.x,fan.p.y,40/(innerHeight-52),a)
    
}
function notInArray(ar,n){
    for (let i = 0; i < ar.length; i++){
        if (ar[i]===n){
            return false
        }
    }
    return true
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
///
/// Compressed saves
///
function encode(){
    let str = ``
    lines.forEach(l=>{
        let s = l.s
        if (l.m.s){
            s = l.m.s
        }
        str += `${l.p1.x},${l.p1.y},${l.p2.x},${l.p2.y},${l.w},${l.m.h?"t":"f"},${l.m.p.x},${l.m.p.y},${l.m.t},${s}n`
    })
    
    str+=";"
    fans.forEach(f=>{
        str += `${f.p.x},${f.p.y},${f.s},${f.dir.x},${f.dir.y},${f.md}n`
    })
    
    str+=";"
    valves.forEach(v=>{
        str += `${v.p.x},${v.p.y},${v.r},${v.c[0]},${v.c[1]},${v.c[2]},${v.o?"t":"f"}n`
    })
    str+=";"
    tcans.forEach(t=>{
        str += `${t.x},${t.y}n`
    })
    return str
}
function testEncode(){
    const buf = new ArrayBuffer(lines.length*73+fans.length*48+valves.length*16+tcans.length*8)
    const view = new DataView(buf)
    view.setUint16(0, lines.length)
    view.setUint16(2, fans.length)
    view.setUint16(4, valves.length)
    view.setUint16(6, tcans.length)
    let byte = 8
    lines.forEach(l=>{
        let s = l.s
        if (l.m.s){
            s = l.m.s
        }
        //73 bytes
        view.setFloat32(byte, l.p1.x)
        byte += 4
        view.setFloat32(byte, l.p1.y)
        byte += 4
        view.setFloat32(byte, l.p2.x)
        byte += 4
        view.setFloat32(byte, l.p2.y)
        byte += 4
        view.setFloat32(byte, l.w)
        byte += 4
        view.setUint8(byte, l.m.h ? 0:1)
        byte ++
        view.setFloat32(byte, l.m.p.x)
        byte += 4
        view.setFloat32(byte, l.m.p.y)
        byte += 4
        view.setFloat32(byte, l.m.t)
        byte += 4
        view.setFloat32(byte, s)
        byte += 4
    })
    fans.forEach(f=>{
        // 48 bytes
        
        view.setFloat32(byte, f.p.x)
        byte += 4
        view.setFloat32(byte, f.p.y)
        byte += 4
        view.setFloat32(byte, f.s)
        byte += 4
        view.setFloat32(byte, f.dir.x)
        byte += 4
        view.setFloat32(byte, f.dir.y)
        byte += 4
        view.setFloat32(byte, f.md)
        byte += 4
    })
    valves.forEach(v=>{
        //16 bytes
        view.setFloat32(byte, v.p.x)
        byte += 4
        view.setFloat32(byte, v.p.y)
        byte += 4
        view.setFloat32(byte, v.r)
        byte += 4
        view.setUint8(byte, v.c[0])
        byte ++
        view.setUint8(byte, v.c[1])
        byte ++
        view.setUint8(byte, v.c[2])
        byte ++
        view.setUint8(byte, v.o ? 0:1)
        byte ++
    })
    tcans.forEach(t=>{
        // 8 bytes
        view.setFloat32(byte, t.x)
        byte += 4
        view.setFloat32(byte, t.y)
        byte += 4
    })
    const uint8Array = new Uint8Array(buf)
    const regularArray = Array.from(uint8Array)
    return btoa(regularArray.join(''))
}
const pf = parseFloat
function decode(str){
    objs=[]
    lines=[]
    valves=[]
    fans=[]
    tcans=[]
    cn=0
    ml =false
    deleting=false
    adding.ia=false
        const things = str.split(";")

        const ls = things[0].split("n")
        for (let i = 0; i < ls.length-1; i++){

            
            const parts = ls[i].split(",")
            const p1 = v(pf(parts[0]),pf(parts[1]))
            const p2 = v(pf(parts[2]),pf(parts[3]))
            const mp = v(pf(parts[6]),pf(parts[7]))
            lines.push({p1,p2,w:pf(parts[4]), m:{h:parts[5]==="t",p:mp,t:pf(parts[8]),s:pf(parts[9])},np1:p1,np2:p2,s:pf(parts[9])})
            lninp.max=lines.length-1
        }
        const fs = things[1].split("n")
        for (let i = 0; i < fs.length-1; i++){
            const parts = fs[i].split(",")
            //psdirmd
            
            fans.push({
                p: v(pf(parts[0]),pf(parts[1])),
                s: pf(parts[2]),
                dir: v(pf(parts[3]),pf(parts[4])),
                md:pf(parts[5])
            })
        }
        const vs = things[2].split("n")
        for (let i = 0; i < vs.length-1; i++){
            const parts = vs[i].split(",")
            //prco
            valves.push({
                p:v(pf(parts[0]),pf(parts[1])),
                r:pf(parts[2]),
                c:[pf(parts[3]),pf(parts[4]),pf(parts[5])],
                o:parts[6]==="t"
            })
        }
        const ts = things[3].split("n")
        for (let i = 0; i < ts.length-1; i++){
            const parts = ts[i].split(",")
            //prco
            tcans.push({
                x:pf(parts[0]),
                y:pf(parts[1])
            })
        }
        loading=false
}
function testDecode(buf){
    const view= new DataView(buf)
    const linen = view.getUint16(0)
    const valven = view.getUint16(2)
    const fann = view.getUint16(4)
    const tcann = view.getUint16(6)
    let byte = 8
    for (let i = 0; i < linen; i++){
        const p1x = view.getFloat32(byte)
        byte += 4
        const p1y = view.getFloat32(byte)
        byte += 4
        const p2x = view.getFloat32(byte)
        byte += 4
        const p2y = view.getFloat32(byte)
        byte += 4
        const lw = view.getFloat32(byte)
        byte += 4
        const hm = view.getUint8(byte) ===0 ? false:true
        byte ++
        const mpx = view.getFloat32(byte)
        byte += 4
        const mpy = view.getFloat32(byte)
        byte += 4
        const mt = view.getFloat32(byte)
        byte += 4
        const ms = view.getFloat32(byte)
        byte += 4
        const p1 = v(p1x,p1y)
        const p2 = v(p2x, p2y)
        const mp = v(mpx, mpy)
        lines.push({p1,p2,w:lw, m:{h:hm,p:mp,t:mt,s:ms},np1:p1,np2:p2,s:ms})
    }
    for (let i = 0; i < fann; i++){
        const x = view.getFloat32(byte)
        byte += 4
        const y = view.getFloat32(byte)
        byte += 4
        const s = view.getFloat32(byte)
        byte += 4
        const dx = view.getFloat32(byte)
        byte += 4
        const dy = view.getFloat32(byte)
        byte += 4
        const md = view.getFloat32(byte)
        byte += 4
    }
    for (let i = 0; i < valven; i++){
        const px = view.getFloat32(byte)
        byte += 4
        const py = view.getFloat32(byte)
        byte += 4
        const r = view.getFloat32(byte)
        byte += 4
        const red = view.getUint8(byte)
        byte ++
        const green = view.getUint8(byte)
        byte ++
        const blue = view.getUint8(byte)
        byte ++
        const o = view.getUint8(byte) === 0 ? false : true
        byte ++
        valves.push({
            p:v(px, py),
            r,
            c:[red,green,blue],
            o
        })
    }
    for (let i = 0; i < tcann; i++){
        const x = view.getFloat32(byte)
        byte += 4
        const y = view.getFloat32(byte)
        byte += 4
        valves.push(v(x,y))
    }
}
String.prototype.removeCharAt = function (i) {
    var tmp = this.split(''); // convert to an array
    tmp.splice(i - 1 , 1); // remove 1 element from the array (adjusting for non-zero-indexed counts)
    return tmp.join(''); // reconstruct the string
}
function saveData(data, name) {
    if(localStorage.getItem(name) !== null){
        localStorage.clear()
        localStorage.setItem(name, data);
    }
    else{
        localStorage.setItem(name, data);
    }
}
function getStorage(name){
    if(localStorage.getItem(name) !== null){
        return localStorage.getItem(name)
    }
}
//
// END COMPRESSED SAVES
//
function seperateLines(x,y){
    let line1 = [false, 0,0]
    for (let i = 0; i < lines.length; i++){
        const l = lines[i]
        if (!line1[0]){
            if (dist(l.p1,{x,y}) <= Math.max(l.w/2,10)){
                line1=[true,0,i]
            }
            if (dist(l.p2,{x,y}) <= Math.max(l.w/2,10)){
                line1=[true,1,i]
            }
        } else {
            const ol = lines[line1[2]]
            if (line1[1]===0){
                    //o ,t
                if (dist(l.p1,{x,y}) <= Math.max(l.w/2,10)){
                    //p1,p1
                    const sd = ol.w/2+l.w/2
                    const tsd = norm(subVec(l.p2,ol.p2))
                    const osd = norm(subVec(ol.p2,l.p2))
                    l.p1 = addVec(l.p1, multVecCon(tsd,sd))
                    ol.p1 = addVec(ol.p1, multVecCon(osd,sd))
                }
                if (dist(l.p2,{x,y}) <= Math.max(l.w/2,10)){
                    const sd = ol.w/2+l.w/2
                    const tsd = norm(subVec(l.p1,ol.p2))
                    const osd = norm(subVec(ol.p2,l.p1))
                    l.p2 = addVec(l.p2, multVecCon(tsd,sd))
                    ol.p1 = addVec(ol.p1, multVecCon(osd,sd))
                    //p1,p2
                    //stuf
                }
            } else {
                if (dist(l.p1,{x,y}) <= Math.max(l.w/2,10)){
                    const sd = ol.w/2+l.w/2
                    const tsd = norm(subVec(l.p2,ol.p1))
                    const osd = norm(subVec(ol.p1,l.p2))
                    l.p1 = addVec(l.p1, multVecCon(tsd,sd))
                    ol.p2 = addVec(ol.p2, multVecCon(osd,sd))
                    //p2, p1
                    //stuf
                }
                if (dist(l.p2,{x,y}) <= Math.max(l.w/2,10)){
                    const sd = ol.w/2+l.w/2
                    const tsd = norm(subVec(l.p1,ol.p1))
                    const osd = norm(subVec(ol.p1,l.p1))
                    l.p2 = addVec(l.p2, multVecCon(tsd,sd))
                    ol.p2 = addVec(ol.p2, multVecCon(osd,sd))
                    //p2, p2
                    //stuf
                }
            }
        }
    }
}
function generateArc(x,y,sx,sy,mx,my,w,cw){
    const v1 = subVec({x:sx,y:sy},{x,y})
    let v2 = norm(subVec({x:mx,y:my},{x,y}))
    const rad = dist({x,y},{x:sx,y:sy})
    v2 = multVecCon(v2,rad)
    let ang = getAngleVec(v1,v2,cw)

    if (cw){
        ang = 2*Math.PI-ang
    }
    const addAng = ang/cres
    ang +=addAng
    const startAng =getAngleVec({x:0,y:rad},v1,!cw)
    let curve = [{x:sx,y:sy}]
        for (let a = startAng; a < startAng+ang; a+=addAng){
            curve.push(
                {
                    x: Math.sin(a)*rad+x,
                    y: Math.cos(a)*rad+y
                }
            )
        }
    for (let i = 1; i < curve.length-1; i++){
        lines.push({p1:curve[i],p2:curve[i+1],w:w, m:{h:false,p:{x:0,y:0},t:0},np1:curve[i],np2:curve[i+1],s:0.05})
    }
    lninp.max=lines.length-1
}
function logInForum(usrname, pword){
    fetch("https://boxsandforum.onrender.com/gyat.html", {
        method: "POST",
        body: {username: usrname, password: pword}
    })
}
function generateArcPrev(x,y,sx,sy,mx,my,w,cw){
    const v1 = subVec({x:sx,y:sy},{x,y})
    let v2 = norm(subVec({x:mx,y:my},{x,y}))
    const rad = dist({x,y},{x:sx,y:sy})
    v2 = multVecCon(v2,rad)
    let ang = getAngleVec(v1,v2,cw)

    if (cw){
        ang = 2*Math.PI-ang
    }
    const addAng = ang/cres
    ang +=addAng
    const startAng =getAngleVec({x:0,y:rad},v1,!cw)
    let curve = [{x:sx,y:sy}]
        for (let a = startAng; a < startAng+ang; a+=addAng){
            curve.push(
                {
                    x: Math.sin(a)*rad+x,
                    y: Math.cos(a)*rad+y
                }
            )
        }
    ctx.beginPath()
    ctx.lineWidth = w
    ctx.moveTo(curve[0].x,curve[0].y)
    for (let i = 1; i < curve.length-1; i++){
        ctx.lineTo(curve[i].x,curve[i].y)
    }
    ctx.stroke()
    lninp.max=lines.length-1
}
function generateBezier(x1,y1,x2,y2,cpx,cpy,w){
    try{
    const d1 = dist({x:x1,y:y1},{x:cpx,y:cpy})
    const d2 = dist({x:x2,y:y2},{x:cpx,y:cpy})
    const step1 = d1/cres
    const step2 = d2/cres
    const n2 = divVecCon(subVec({x:x2,y:y2},{x:cpx,y:cpy}),d2)
    const n1 = divVecCon(subVec({x:cpx,y:cpy},{x:x1,y:y1}),d1)
    let curve = []
    for (let i = 0; i < cres; i++){
        const p1 = addVec(multVecCon(n1, step1*i),{x:x1,y:y1})
        const p2 = addVec(multVecCon(n2, step2*i),{x:x2,y:y2})
        const dpts = dist(p1,p2)
        const step = dpts/cres
        const n = divVecCon(subVec(p2, p1),dpts)
        const p = addVec(multVecCon(n,step*i),p1)
        curve.push(p)
    }
    for (let i = 0; i < curve.length-1; i++){
        lines.push({p1:curve[i],p2:curve[i+1],w:w, m:{h:false,p:{x:0,y:0},t:0},np1:curve[i],np2:curve[i+1],s:0.05})
    }
}catch(e){alert(e)}
}
function generateBezierPrev(x1,y1,x2,y2,cpx,cpy,w){
    try{
    const d1 = dist({x:x1,y:y1},{x:cpx,y:cpy})
    const d2 = dist({x:x2,y:y2},{x:cpx,y:cpy})
    const step1 = d1/cres
    const step2 = d2/cres
    const n2 = divVecCon(subVec({x:x2,y:y2},{x:cpx,y:cpy}),d2)
    const n1 = divVecCon(subVec({x:cpx,y:cpy},{x:x1,y:y1}),d1)
    let curve = []
    for (let i = 0; i < cres; i++){
        const p1 = addVec(multVecCon(n1, step1*i),{x:x1,y:y1})
        const p2 = addVec(multVecCon(n2, step2*i),{x:x2,y:y2})
        const dpts = dist(p1,p2)
        const step = dpts/cres
        const n = divVecCon(subVec(p2, p1),dpts)
        const p = addVec(multVecCon(n,step*i),p1)
        curve.push(p)
    }
    ctx.beginPath()
    ctx.lineWidth = w
    ctx.moveTo(curve[0].x,curve[0].y)
    for (let i = 0; i < curve.length-1; i++){
        ctx.lineTo(curve[i].x,curve[i].y)
    }
    ctx.stroke()
    lninp.max=lines.length-1
}catch(e){alert(e)}
}
function processFile(files) {
    const file = files[0];

    const reader = new FileReader()
    reader.onload = function (e) {
        if (e.target.result.charAt(0)==="{"){
            saved = JSON.parse(e.target.result);
            objs=[]
            lines=[]
            valves=[]
            cn=0
            ml =false
            for (let i = 0; i < saved.objs.length; i++){
                const o = saved.objs[i]
                objs.push(new Obj(o.x, o.y, o.r, o.c, o.w, o.vx, o.vy, o.b, o.liquid, o.surftens))
                objs[i].f = o.f
            }
            for (let i = 0; i < saved.valves.length; i++){
                const o = saved.valves[i]
                valves.push({p:o.p,r:o.r,c:o.c,o:o.o})
            }
            lines = saved.lines
            fans = saved.fans
            tcans = saved.tcans
        } else {
            if (parseUint(e.target.result.charAt(0))){
                decode(e.target.result)
            }
            decode(atob(e.target.result))
        }
    }
    reader.readAsText(file)
}
const objToString = obj => Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(',\n');
function log(text){
    const tt = typeof text
    switch(tt){
        case "string":
            getEl("result").innerText += "\n"+text
            break
        case "number":
            getEl("result").innerText += "\n"+text
            break
        case "object":
            getEl("result").innerText += "\n"+objToString(text)
            break
        case "array":
            getEl("result").innerText += "\n["+text+"]"
            break
        default:
            getEl("result").innerText += "\n"+text
    }
    
}
function clearConsole(){
    getEl("result").innerText=""
}
function textToHTML(text){
    return text.replace("\n", "<br>")
}