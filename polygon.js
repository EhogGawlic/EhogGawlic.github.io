const square = [
    {x:-10,y:-10},
    {x:-10,y:10},
    {x:10,y:10},
    {x:10,y:-10}
]
class Polygon{
    constructor(verts,p,v,r,rv,mass){
        this.verts=verts
        this.p=p
        this.v=v
        this.r=r
        this.a={x:0,y:0}
        this.rv=rv
        this.mass=mass
    }
    getTransformedVertices() {
        const cos = Math.cos(this.angle)
        const sin = Math.sin(this.angle)
        return this.vertices.map(v => ({
            x: this.position.x + v.x * cos - v.y * sin,
            y: this.position.y + v.x * sin + v.y * cos
        }));
    }
    integrate(){
        this.verts = this.getTransformedVertices()
        this.v = addVec(this.v, this.a)
        this.p = addVec(this.v, this.p)
        this.a = {x:0, y:grav}
        this.r+=this.rv
    }
    testSAT(p2){
        const axes = this.verts.map((v,i)=>{
            const nextV = this.verts[(i + 1) % this.verts.length]
            return {
                x: v.y - nextV.y,
                y: nextV.x - v.x
            }
        })
        for (let i = 0; i < axes.length; i++) {
            const axis = axes[i];
            // project both shapes onto the axis
            const p1 = this.project(axis)
            const p2 = p2.project(axis)
            if (!p1.overlap(p2)) {
                return false // No overlap on this axis, so no collision
            }
        }
        //mtv
        return {p1,p2, mtv: p1.min < p2.min ? {x: p2.min - p1.max, y: 0} : {x: p1.min - p2.max, y: 0}} // Overlap found
    }
    doMTV(mtv,poly2){
        const mtvLength = Math.sqrt(mtv.x * mtv.x + mtv.y * mtv.y)
        if (mtvLength === 0) return
        const normalizedMTV = { x: mtv.x / mtvLength, y: mtv.y / mtvLength }
        
        // Move the polygon by the MTV
        this.p.x += normalizedMTV.x
        this.p.y += normalizedMTV.y
        poly2.p.x -= normalizedMTV.x
        poly2.p.y -= normalizedMTV.y
        
        // Update vertices after moving
        this.verts = this.getTransformedVertices()
    }
    doAllColl(){

    }
    project(axis) {
        const min = this.verts.reduce((min, v) => Math.min(min, dot(v, axis)), Infinity)
        const max = this.verts.reduce((max, v) => Math.max(max, dot(v, axis)), -Infinity)
        return {
            min: min,
            max: max,
            overlap: function(other) {
                return !(this.max < other.min || this.min > other.max)
            }
        }
    }
}