"use strict";
import {Vec2, Vec3, addVec2,addVec3,subVec2,subVec3,multVec2,multVec3,divVec2,divVec3,multVec22,multVec32,divVec22,divVec32,dist2, dist3, URD2, URD3, norm2, norm3, dot2, dot3, reflect2, reflect3} from "./vec.js"


export class Fan2{
    constructor(pos, dir, type, strength, focus, initialRadius){
        this.pos=pos
        this.dir=dir
        this.type=type
        this.s=strength
        this.focus=focus
        this.r=initialRadius
    }
    clone(){
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.pos = new Vec2(this.pos.x, this.pos.y)
        copy.dir = new Vec2(this.dir.x, this.dir.y)
        return copy
    }
    windSpeedFromDist(d){ // real math, unlike my other one
        const nRad = this.r + d*Math.tan(this.focus) // Get radius
        const rComp = (this.r / nRad) ** 2 // Do shit
        return this.s * rComp // Use speed
    }
    applyFanBall(ball){
        if (ball.f) return
        const toBall = subVec2(ball.p, this.pos)
        const d = dot2(toBall, this.dir)
        if (d < 0) return
        const projPoint = addVec2(this.pos, multVec22(this.dir, d))
        const perpDist = subVec2(ball.p, projPoint)
        const h = Math.sqrt(perpDist.x**2 + perpDist.y**2)
        const coneRadius = this.r + d * Math.tan(this.focus)
        if (h > coneRadius + ball.r) return
        const speed = this.windSpeedFromDist(d)
        const accelDelta = multVec22(this.dir, speed / ball.m)
        ball.p = addVec2(ball.p, accelDelta)
    }
    applyFanRB(rigid){
        if (rigid.f) return

        //optimization
        const r = this.r + Math.max(0, rigid.maxX - this.pos.x, rigid.maxY - this.pos.y) * Math.tan(this.focus)
        if (rigid.maxX < this.pos.x - r || rigid.minX > this.pos.x + r ||
            rigid.maxY < this.pos.y - r || rigid.minY > this.pos.y + r) {
            return
        }
        const pts = rigid.pts
        const n = pts.length
        // fan shi
        
        for (let i = 0; i < n; i++) {
            const q = pts[i]
            const toPt = subVec2(q.p, this.pos)
            const d = dot2(toPt, this.dir)
            if (d < 0) continue
            const projX = this.pos.x + this.dir.x * d
            const projY = this.pos.y + this.dir.y * d
            const h2 = (q.p.x - projX) ** 2 + (q.p.y - projY) ** 2
            const coneRadius = this.r + d * Math.tan(this.focus)
            if (h2 > (coneRadius + q.r) ** 2) continue
            const speed = this.windSpeedFromDist(d)
            const pushMag = speed / q.m
            q.p.x += this.dir.x * pushMag
            q.p.y += this.dir.y * pushMag
        }
    }
    static applyAll(fans, objs, rbs){
        objs.forEach(o=>{
            fans.forEach(f=>{
                f.applyFanBall(o)
            })
        })
        rbs.forEach(o=>{
            fans.forEach(f=>{
                f.applyFanRB(o)
            })
        })
    }
}

export class Fan3{
    constructor(pos, dir, type, strength, focus, initialRadius){
        this.pos=pos
        this.dir=dir
        this.type=type
        this.s=strength
        this.focus=focus
        this.r=initialRadius
    }
    clone(){
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        copy.pos = new Vec3(this.pos.x, this.pos.y, this.pos.z)
        copy.dir = new Vec3(this.dir.x, this.dir.y, this.dir.z)
        return copy
    }
    windSpeedFromDist(d){ // real math, unlike my other one
        const nRad = this.r + d*Math.tan(this.focus) // Get radius
        const rComp = (this.r / nRad) ** 2 // Do shit
        return this.s * rComp // Use speed
    }
    applyFanBall(ball){
        if (ball.f) return
        const toBall = subVec3(ball.p, this.pos)
        const d = dot3(toBall, this.dir)
        if (d < 0) return
        const projPoint = addVec3(this.pos, multVec32(this.dir, d))
        const perpDist = subVec3(ball.p, projPoint)
        const h = Math.sqrt(perpDist.x**2 + perpDist.y**2 + perpDist.z**2)
        const coneRadius = this.r + d * Math.tan(this.focus)
        if (h > coneRadius + ball.r) return
        const speed = this.windSpeedFromDist(d)
        const accelDelta = multVec32(this.dir, speed / ball.m)
        ball.p = addVec3(ball.p, accelDelta)
    }
    applyFanRB(rigid){
        if (rigid.f) return

        //optimization
        const r = this.r + Math.max(0, rigid.maxX - this.pos.x, rigid.maxY - this.pos.y, rigid.maxY - this.pos.y) * Math.tan(this.focus)
        if (rigid.maxX < this.pos.x - r || rigid.minX > this.pos.x + r ||
            rigid.maxY < this.pos.y - r || rigid.minY > this.pos.y + r ||
            rigid.maxZ < this.pos.z - r || rigid.minZ > this.pos.z + r) {
            return
        }
        const pts = rigid.pts
        const n = pts.length
        // fan shi
        
        for (let i = 0; i < n; i++) {
            const q = pts[i]
            const toPt = subVec3(q.p, this.pos)
            const d = dot3(toPt, this.dir)
            if (d < 0) continue
            const projX = this.pos.x + this.dir.x * d
            const projY = this.pos.y + this.dir.y * d
            const projZ = this.pos.z + this.dir.z * d
            const h2 = (q.p.x - projX) ** 2 + (q.p.y - projY) ** 2 + (q.p.z - projZ) ** 2
            const coneRadius = this.r + d * Math.tan(this.focus)
            if (h2 > (coneRadius + q.r) ** 2) continue
            const speed = this.windSpeedFromDist(d)
            const pushMag = speed / q.m
            q.p.x += this.dir.x * pushMag
            q.p.y += this.dir.y * pushMag
            q.p.z += this.dir.z * pushMag
        }
    }
    static applyAll(fans, objs, rbs){
        objs.forEach(o=>{
            fans.forEach(f=>{
                f.applyFanBall(o)
            })
        })
        rbs.forEach(o=>{
            fans.forEach(f=>{
                f.applyFanRB(o)
            })
        })
    }
}
