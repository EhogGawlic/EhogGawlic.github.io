// Reading window.innerHeight is a native DOM getter call; doing it per ball per substep is very
// slow. Cache it and refresh only when the window actually changes size.
let wallEdge = innerHeight - 75
addEventListener("resize", () => { wallEdge = innerHeight - 75 })
const airDrag = 0.005
class Obj {
    p
    pp
    v
    a={x:0,y:0}
    c=[0,0,0]
    w=2**31//2038 in unix time idk
    r=10
    b=0.5
    n=0
    s=false
    f=false
    tb = []
    liquid= false
    surftens = 0
    rot = 0
    rotv = 0
    rota=0
    magnetism = 0
    friction=0.5
    texture = null
    constructor(x, y, r, c, w, vx, vy, b, l, st, f) {
        this.p={x,y}
        this.v={x:vx*(meterPixRatio/targetRate),y:vy*(meterPixRatio/targetRate)}
        this.pp=subVec(this.p, this.v)
        this.w=w
        this.c=c
        this.r=r
        this.b=b
        this.n=objs.length
        this.f=f || fixed.checked
        this.liquid = l
        this.surftens = st/this.w
    }
    phys(){
        if (!this.f){
            this.v=divVecCon(addVec(subVec(this.p, this.pp), this.a), 1)//fric)
            // clamp extreme velocities to avoid numerical blow-up
            const maxVel = 500 // pixels per frame (tune as needed)
            const vmag = Math.hypot(this.v.x, this.v.y)
            if (vmag > maxVel){
                const s = maxVel / vmag
                this.v.x *= s
                this.v.y *= s
            }
            const drag = Math.min(
                0.01,
                (airDrag * this.r * 2) / Math.max(this.w, 1)
            )
            this.v.x *= 1 - drag
            this.v.y *= 1 - drag

            this.pp=this.p
            this.p=addVec(this.p, this.v)
            
            this.a={x:0,y:(meterPixRatio*grav)/targetRate}
            this.rot+=this.rotv
            this.rotv+=this.rota
            this.rota=0
            for (const speedo of speedos){
                const d = dist(this.p, speedo)
                if (d < this.r+10){
                    const totVel = Math.hypot(this.v.x, this.v.y)
                    speedo.v = totVel
                }
            }
        }
    }
    addForce(m, f){
        f = divVecCon(f, this.w*2*this.r/m)
        this.a = addVec(this.a, f)
    }
    surfTens(){
        /*if (this.liquid){
            let i = 0
            objs.forEach(o => {
                if (i !== this.i){
                    const d = dist(o.p, this.p)
                    if (d<=this.r+b.r && d!==0){
                        this.tb.push([o,d,i])
                    }
                }
                i++
            })
            this.tb.forEach(o => {
                
                const st = (this.surftens+o[0].surftens)*0.5
            })
            this.tb=[]
        }*/
    }
    collline(l){
        
            let np = {x:0,y:0}
            if (l.rail && l.rail.has && l.rail.kfs.length){
                let rl = 0
                l.rail.kfs.forEach(kf=>{
                    rl += dist(kf.sp,kf.ep)
                })
                let td = l.rail.t / rl
                if (td > 1){
                    
                    td = 2-td
                }
                np = multVecCon(subVec(l.rail.kfs[0].ep,l.rail.kfs[0].sp) ,td)
            }
            const sp1 = subVec(l.p1,l.m.p)
        const sp2 = subVec(l.p2, l.m.p)
        const x1 = sp1.x*Math.cos(l.m.t)-sp1.y*Math.sin(l.m.t)+l.m.p.x+np.x
        const y1 = sp1.x*Math.sin(l.m.t)+sp1.y*Math.cos(l.m.t)+l.m.p.y+np.y
        const x2 = sp2.x*Math.cos(l.m.t)-sp2.y*Math.sin(l.m.t)+l.m.p.x+np.x
        const y2 = sp2.x*Math.sin(l.m.t)+sp2.y*Math.cos(l.m.t)+l.m.p.y+np.y
        const v1 = {x:x1,y:y1}
        const v2 = {x:x2,y:y2}
        const d = ( ((this.p.x-x1)*(x2-x1)) + ((this.p.y-y1)*(y2-y1)) ) / dist(v1, v2)**2;
        let cx = x1 + (d * (x2-x1))
        let cy = y1 + (d * (y2-y1))
        try{const os = linePoint(v1, v2, {x:cx,y:cy})
        if (os !== "EE"){
            cx = os.x
            cy = os.y
        }}catch(e){alert(e)}
        const dis = dist({x:cx,y:cy},this.p)-l.w/2
        if (dis <= this.r){
            const N = norm(subVec(this.p, {x:cx,y:cy}))
            this.p = addVec(this.p, multVecCon(N, this.r-dis))
        }
    }
    collwall(){
        if (!inf){
            if (this.p.y>=wallEdge-this.r){
                this.p.y=wallEdge-this.r
                this.pp.y = this.p.y+this.v.y*this.b
            }
            if (this.p.x>=wallEdge-this.r){
                this.p.x=wallEdge-this.r
                this.pp.x = this.p.x+this.v.x*this.b
            }
            if (this.p.x<=this.r){
                this.p.x=this.r
                this.pp.x = this.p.x+this.v.x*this.b
            }
        }
        // Lines: uses the per-substep cache built by prepareLines() (call it once per substep,
        // before the ball loop). Same math as collline(), with no allocations and a cheap
        // bounding-box reject so most balls skip most lines.
        const L = lineCache
        const r = this.r
        for (let i = 0, o = 0; i < lineCacheN; i++, o += LINE_STRIDE) {
            const px = this.p.x, py = this.p.y
            const hw = L[o + 5]
            const m = r + hw
            if (px + m < L[o + 6] || px - m > L[o + 7] || py + m < L[o + 8] || py - m > L[o + 9]) continue
            const x1 = L[o], y1 = L[o + 1], dx = L[o + 2], dy = L[o + 3]
            let t = ((px - x1) * dx + (py - y1) * dy) * L[o + 4]
            t = t < 0 ? 0 : (t > 1 ? 1 : t)                 // closest point on the segment
            const ex = px - (x1 + t * dx)
            const ey = py - (y1 + t * dy)
            const d2 = ex * ex + ey * ey
            if (d2 <= m * m && d2 > 0) {
                const d = Math.sqrt(d2)
                const k = (r + hw - d) / d                  // push out along the contact normal
                this.p.x = px + ex * k
                this.p.y = py + ey * k
            }
        }
    }
    collideball(b){
        //ua+ab=va+vb
        //v' = (m1v1 + m2v2)/m1 + m2.
        const dNS = LD(this.p, b.p)
        if (dNS<(this.r+b.r)**2){
            const d = Math.sqrt(dNS)
            if (d!==0){

                if (!this.f && !b.f){
                    const collNorm = norm(subVec(this.p, b.p))
                    const adjdist = d-(this.r+b.r)
                    //const adc = nw2/nw1
                    const b1b = this.r>b.r
                    let nw1 = 0
                    let nw2 = 0
                    if (b1b){
                        nw1 = this.w*(this.r/b.r)
                        nw2 = b.w
                    } else {
                        nw1 = this.w
                        nw2 = b.w*(b.r/this.r)
                    }
                    const mb = 1/(nw1+nw2)
                    
                    const ad1 = (mb*nw2)
                    const ad2 = (mb*nw1)
                    const rmb = 1/(this.r+b.r)
                    const rm1 =rmb*this.r
                    const rm2 = rmb * b.r
                    this.p = addVec(this.p, multVecCon(collNorm, -ad1*rm1*adjdist))
                    b.p = addVec(b.p, multVecCon(collNorm, ad2*rm2*adjdist))
                    /*const vn = divVecCon(addVec(multVecCon(this.v, this.w), multVecCon(b.v, nw2)), this.w+nw2)

                    const cm = this.w+nw2
                    const tadj = nw2/cm
                    const oadj = this.w/cm
                    //alert(oadj)
                    this.a = addVec(this.a, multVecCon(vn, tadj))
                    b.a = addVec(b.a, multVecCon(vn, -oadj))*/
                }
                if (b.f && !this.f){
                    const mb = (this.r+b.r)/d
                    this.p = subVec(this.p, b.p)
                    this.p = multVecCon(this.p, mb)
                    this.p = addVec(this.p, b.p)
                }
            } else {
                this.a = addVec(this.a, {x:Math.random()-0.5, y: Math.random()-0.5})
            }
        }
    }
    collall(includeBallCollisions = true){
        if (includeBallCollisions){
            for (let i = 0; i < objs.length; i++){
                if (i!==this.n){
                    this.collideball(objs[i])
                }
            }
        }

        valves.forEach(v =>{
            if (!v.o){
                const d = dist(this.p, v.p)
                if (d < this.r+v.r){
                    const mb = (this.r+v.r)/d
                    this.p = subVec(this.p, v.p)
                    this.p = multVecCon(this.p, mb)
                    this.p = addVec(this.p, v.p)
                }
            }
        })
        magnets.forEach(mag=>{
            const d = dist(this.p, mag)
            const contactDistance = this.r + 32
            if (d < contactDistance){
                let normal
                if (d > 0) {
                    normal = norm(subVec(this.p, mag))
                } else {
                    const speed = Math.hypot(this.v.x, this.v.y)
                    normal = speed > 0 ? norm(this.v) : {x: 1, y: 0}
                }
                this.p = addVec(mag, multVecCon(normal, contactDistance))
                const radialVelocity = this.v.x * normal.x + this.v.y * normal.y
                const tangentialVelocity = subVec(this.v, multVecCon(normal, radialVelocity))
                const reboundVelocity = Math.max(0, radialVelocity) * 0.1
                this.v = addVec(tangentialVelocity, multVecCon(normal, reboundVelocity))
                this.pp = subVec(this.p, this.v)
            }

        })
    }
    draw(){
        if (this.texture){
            const tex = textures[this.texture]
            if (tex){
                ctx.save()
                ctx.beginPath()
                ctx.arc(this.p.x+emv.x, this.p.y+emv.y, this.r, 0, Math.PI * 2)
                ctx.clip()
                
                // Calculate aspect ratio and scale to fit circle
                const aspectRatio = tex.width / tex.height
                let drawWidth = this.r * 2
                let drawHeight = this.r * 2
                
                if (aspectRatio > 1) {
                    // Wider than tall - constrain by height
                    drawWidth = drawHeight * aspectRatio
                } else {
                    // Taller than wide - constrain by width
                    drawHeight = drawWidth / aspectRatio
                }
                
                // Center the texture
                const offsetX = this.p.x - drawWidth / 2 + emv.x
                const offsetY = this.p.y - drawHeight / 2 + emv.y
                
                ctx.drawImage(tex, offsetX, offsetY, drawWidth, drawHeight)
                ctx.restore()
            }
            return
        }
        if (this.s){
            ctx.strokeStyle = "blue"
            ctx.lineWidth = 2
        } else {
            ctx.strokeStyle = "black"
            ctx.lineWidth =1
        }
        if (this.liquid){try{
            ctx.strokeStyle = "rgba(1,1,1,0)"
            ctx.fillStyle = `rgb(${this.c[0]},${this.c[1]},${this.c[2]})`
            ctx.beginPath()
            ctx.arc(this.p.x+emv.x,this.p.y+emv.y, this.r, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = `rgba(${this.c[0]},${this.c[1]},${this.c[2]}, 0.66)`
            ctx.beginPath()
            ctx.arc(this.p.x+emv.x,this.p.y+emv.y, this.r*(waterBlur/2+1), 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = `rgba(${this.c[0]},${this.c[1]},${this.c[2]}, 0.33)`
            ctx.beginPath()
            ctx.arc(this.p.x+emv.x,this.p.y+emv.y, this.r*(waterBlur+1), 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
        }catch(err){alert(err)}
        } else {
            ctx.fillStyle=`rgb(${this.c[0]},${this.c[1]},${this.c[2]})`
            ctx.beginPath()
            ctx.arc(this.p.x+emv.x,this.p.y+emv.y, this.r, 0, 2 * Math.PI)
            ctx.stroke()
            ctx.fill()
        }
    }
}
//const tobj = new Obj(400, 100, 10, [0,0,255], 10, 10, 0, 1)
function addObj(x,y,r,b,c,vx,vy,w){
    objs.push(new Obj(x, y, r*meterPixRatio, c, w, vx*meterPixRatio, vy*meterPixRatio, b, liq, parseFloat(stinp.value)*0.001))
    if (curtex){
    objs[objs.length-1].texture = curtex}
}
function addFan(x,y,speed,d,mp){
    fans.push({
        p:{x,y},
        s:speed,
        dir:d,
        md:dist({x,y},mp)
    })
}

// ---------------------------------------------------------------------------
// Per-substep line cache. Call prepareLines() once per substep BEFORE looping over balls.
// Per line (stride 10): x1, y1, dx, dy, 1/len^2, halfWidth, minX, maxX, minY, maxY
// (world space, after rotation about l.m.p and the rail offset).
// ---------------------------------------------------------------------------
const LINE_STRIDE = 10
let lineCache = new Float64Array(0)
let lineCacheN = 0
function prepareLines() {
    const n = lines.length
    if (lineCache.length < n * LINE_STRIDE) lineCache = new Float64Array(n * LINE_STRIDE)
    for (let i = 0, o = 0; i < n; i++, o += LINE_STRIDE) {
        const l = lines[i]
        let npx = 0, npy = 0
        const rail = l.rail
        if (rail && rail.has && rail.kfs.length) {
            let rl = 0
            for (const kf of rail.kfs) rl += Math.hypot(kf.ep.x - kf.sp.x, kf.ep.y - kf.sp.y)
            let td = rail.t / rl
            if (td > 1) td = 2 - td
            const k0 = rail.kfs[0]
            npx = (k0.ep.x - k0.sp.x) * td
            npy = (k0.ep.y - k0.sp.y) * td
        }
        const c = Math.cos(l.m.t), s = Math.sin(l.m.t), mp = l.m.p
        const ax = l.p1.x - mp.x, ay = l.p1.y - mp.y
        const bx = l.p2.x - mp.x, by = l.p2.y - mp.y
        const x1 = ax * c - ay * s + mp.x + npx
        const y1 = ax * s + ay * c + mp.y + npy
        const x2 = bx * c - by * s + mp.x + npx
        const y2 = bx * s + by * c + mp.y + npy
        const dx = x2 - x1, dy = y2 - y1
        const len2 = dx * dx + dy * dy
        lineCache[o] = x1;     lineCache[o + 1] = y1
        lineCache[o + 2] = dx; lineCache[o + 3] = dy
        lineCache[o + 4] = len2 > 0 ? 1 / len2 : 0
        lineCache[o + 5] = l.w / 2
        lineCache[o + 6] = Math.min(x1, x2); lineCache[o + 7] = Math.max(x1, x2)
        lineCache[o + 8] = Math.min(y1, y2); lineCache[o + 9] = Math.max(y1, y2)
    }
    lineCacheN = n
}