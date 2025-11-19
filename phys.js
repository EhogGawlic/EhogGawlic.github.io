let frict = 0.995
class Obj {
    p
    pp
    v
    a={x:0,y:0}
    c=[0,0,0]
    w=2**64
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
    friction=0.5
    constructor(x, y, r, c, w, vx, vy, b, l, st, f) {
        this.p={x,y}
        this.v={x:vx*(meterPixRatio/targetRate),y:vy*(meterPixRatio/targetRate)}
        this.pp=subVec(this.p, this.v)
        this.w=w
        this.c=c
        this.r=r
        this.b=b
        this.n=objs.length
        this.f=fixed.checked
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
            // slight damping to dissipate energy from constraint corrections
            
            this.v.x *= frict
            this.v.y *= frict

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
            if (l.rail.has && l.rail.kfs.length){
                let rl = 0
                l.rail.kfs.forEach(kf=>{
                    rl += dist(kf.sp,kf.ep)
                })
                const td = l.rail.t / rl
                np = multVecCon(norm(subVec(l.rail.kfs[0].ep,l.rail.kfs[0].sp)) ,td)
                
            }
            const sp1 = subVec(l.p1,addVec(l.m.p,np))
        const sp2 = subVec(l.p2, addVec(l.m.p,np))
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
            if (this.p.y>=innerHeight-this.r){
                this.p.y=innerHeight-this.r
                this.pp.y = this.p.y+this.v.y*this.b
            }
            if (this.p.x>=innerHeight-this.r){
                this.p.x=innerHeight-this.r
                this.pp.x = this.p.x+this.v.x*this.b
            }
            if (this.p.x<=this.r){
                this.p.x=this.r
                this.pp.x = this.p.x+this.v.x*this.b
            }
        }
        lines.forEach(l => {
            this.collline(l)
        })
    }
    getFLIPpos(){
        return {x: Math.floor(this.p.x/cellsize), y: Math.floor(this.p.y/cellsize)}
    }
    getFLIPweights(dx,dy){
        const dxc = dx/cellsize
        const dyc = dy/cellsize
        const w1 = (1-dxc)*(1-dyc)
        const w2 = dxc*(1-dyc)
        const w3 = dxc*dyc
        const w4 = (1-dxc)*dyc
        return [w1,w2,w3,w4]
    }
    getFLIPQP(weights, cell){
        const q1 = flipP[cell.y][cell.x]
        const q2 = flipP[cell.y][cell.x+1]
        const q4 = flipP[cell.y+1][cell.x]
        const q3 = flipP[cell.y+1][cell.x+1]

        let result = divVecCon(
            addVec(addVec(addVec(
            multVecCon(q1, weights[0]),
            multVecCon(q2, weights[1])),
            multVecCon(q3, weights[2])),
            multVecCon(q4, weights[3])),
        
            weights[0]+
            weights[1]+
            weights[2]+
            weights[3]
        )
        result.y -= cellsize*0.5
        return {r:result,q:[q1,q2,q3,q4]}
    }
    flip(){
        const cell = this.getFLIPpos()
        const d = subVec(this.p, multVecCon(cell,cellsize))
        const weights = this.getFLIPweights(d.x, d.y)
        const result = this.getFLIPQP(weights, cell)
        const r = result.r
        const q = result.q
        flipP[cell.y][cell.x] = q[0]
        flipP[cell.y][cell.x+1] = q[1]
        flipP[cell.y+1][cell.x] = q[3]
        flipP[cell.y+1][cell.x+1] = q[2]
        flipR[cell.y][cell.x] += r[0]*weights[0]
        flipR[cell.y][cell.x+1] += r[1]*weights[1]
        flipR[cell.y+1][cell.x] += r[3]*weights[3]
        flipR[cell.y+1][cell.x+1] += r[2]*weights[2]
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
    collall(){
        
        for (let i = 0; i < objs.length; i++){
            if (i!==this.n){
                this.collideball(objs[i])
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
    }
    draw(){
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
}
function addFan(x,y,speed,d,mp){
    fans.push({
        p:{x,y},
        s:speed,
        dir:d,
        md:dist({x,y},mp)
    })
}
function runFLIP(){
    for (let y = 0; y < fliprows; y++){
        for (let x = 0; x < flipcols; x++){
            flipP[y][x]={x:null,y:null}
        }
    }
    for (let y = 0; y < fliprows; y++){
        for (let x = 0; x < flipcols; x++){
            flipR[y][x]=null
        }
    }
    objs.forEach(o => {
        if (o.liquid){
            o.flip()
        }
    })
    for (let i = 0; i < substeps; i++){
        for (let y = 0; y < fliprows; y++){
            for (let x = 0; x < flipcols; x++){
                const cell = flipP[y][x]
                const r1 = flipR[y][x]
                let q1 = flipP[y][x]
                let q2 = flipP[y][x+1]
                const r2 = flipR[y][x+1]
                let q4 = flipP[y+1][x]
                const r4 = flipR[y+1][x]
                let q3 = flipP[y+1][x+1]
                const r3 = flipR[y+1][x+1]
                q1 = divVecCon(q1, r1)
                q2 = divVecCon(q2, r2)
                q3 = divVecCon(q3, r3)
                q4 = divVecCon(q4, r4)

            }
        }
    }   
    objs.forEach(o => {
        if (o.liquid){
            
        }
    })
}
