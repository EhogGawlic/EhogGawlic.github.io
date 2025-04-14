
function projPoly(poly, norm){
    const low = Infinity
    const high = -Infinity
    for (let i = 0; i < poly.pts.length; i++) {
        const d = dot(norm, poly.pts[i]);
        low = Math.min(d, low);
        high = Math.max(d, high);
    }
    return {low,high};
}
class Polygon{
    pts = []
    pos
    ppos
    vel
    acc
    c=[]
    w
    theta = 0
    omega = 0

    constructor(pts, c, w, x, y){
        this.pts = pts
        this.c=c
        this.w=w
        this.pos = {x,y}
        this.ppos=this.pos
        this.vel={x:0,y:0}
    }
    phys(){
        this.vel=divVecCon(addVec(subVec(this.pos, this.ppos), this.acc), 1)//fric)
        this.ppos=this.ppos
        this.pos=addVec(this.p, this.v)
        
        this.acc={x:0,y:(meterPixRatio*9.8)/targetRate}

        this.theta += this.omega
    }
    draw(){
        ctx.beginPath()
        this.pts.forEach(pt => {
            const np = {
                x: Math.cos(this.theta)*pt.x*-Math.sin(theta)+this.pos.x,
                y: Math.sin(this.theta)*pt.y*Math.cos(this.theta)+this.pos.y
            }
            
        })
    }
    SATCollisonDetect(p){
        for (let i = 0; i < p.pts.length; i++){
            let a
            let b = p.pts[i]
            if (i === 0){
                a = p.pts[p.pts.length-1]
            } else {
                a = p.pts[i-1]
            }
            const norm = RotR(norm(subVec(b, a)))
            const d = dot(norm, b)
            low = Math.min(low, d)
            high = Math.max(high, d)
            const pa = projPoly(this, norm)
            const pb = projPoly(p, norm)
            if (pa.high > pb.low && pb.high > pa.low){
                return true
            }
        }
        return false
    }
}