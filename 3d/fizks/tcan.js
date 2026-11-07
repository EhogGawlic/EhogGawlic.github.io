"use strict";
import {Vec2, Vec3, addVec2,addVec3,subVec2,subVec3,multVec2,multVec3,divVec2,divVec3,multVec22,multVec32,divVec22,divVec32,dist2, dist3, URD2, URD3, norm2, norm3, dot2, dot3, reflect2, reflect3} from "./vec.js"

export class Tcan2{
    constructor(pos, sz, pRbIn = 3){
        this.pos=pos
        this.sz=sz
        this.pRbIn=pRbIn
    }
    checkBoundsBall(b){
        return b.p.x > this.pos.x-this.sz*0.5+b.r && b.p.y > this.pos.y-this.sz*0.5+b.r &&
               b.p.x < this.pos.x+this.sz*0.5-b.r && b.p.y < this.pos.y+this.sz*0.5-b.r
    }
    checkBoundsPt(p){
        return p.x > this.pos.x-this.sz*0.5 && p.y > this.pos.y-this.sz*0.5 &&
               p.x < this.pos.x+this.sz*0.5 && p.y < this.pos.y+this.sz*0.5
    }
    checkBoundsRB(rb){
        let totPts = 0
        for (let i = 0; i < rb.pts.length; i++){
            if (this.checkBoundsPt(rb.pts[i].p)) totPts++
            if (totPts >= this.pRbIn) return true
        }
        return false
    }
    static testAllAndDel(tcans, objs, rbs){
        let dIndsO = []
        let dIndsR = []
        for (let i = objs.length-1; i >= 0; i--){//
            let deld = false
            tcans.forEach(tcan => {
                if (!deld && tcan.checkBoundsBall(objs[i])){
                    objs.splice(i,1)
                    dIndsO.push(i)
                    deld=true
                }
            })
        }
        for (let i = rbs.length-1; i >= 0; i--){
            let deld = false
            tcans.forEach(tcan => {
                if (!deld && tcan.checkBoundsRB(rbs[i])){
                    rbs.splice(i,1)
                    dIndsR.push(i)
                    deld=true
                }
            })
        }
        return {dIndsO, dIndsR}
    }
}
export class Tcan3{
    constructor(pos, sz, pRbIn = 6){//can have 2 out of 8 corners outside to count as in
        this.pos=pos
        this.sz=sz
        this.pRbIn=pRbIn
    }
    checkBoundsBall(b){
        // a trash can hitbox is a blender default cylinder (rad: this.sz*0.5, height: this.sz)
        // so if we imagine it as an infinite cylinder along the y axis, we can treat it as two
        // circles, then check the y-axis like normal walls
        const dfc = Math.sqrt((this.pos.x-b.p.x)**2+(this.pos.z-b.p.z)**2)
        // shood i choos fully in or no
        // naah half in is fine
        // actually
        // i choose fully in
        if (dfc < this.sz*0.5-b.r){
            const distAlngY = Math.abs(this.pos.y-b.p.y) // centered
            if (distAlngY < this.sz*0.5){
                return true
            }
        }
        return false
    }
    checkBoundsPt(p){ //mostly for rigidbody
        const dfc = Math.sqrt((this.pos.x-p.x)**2+(this.pos.z-p.z)**2)
        if (dfc < this.sz*0.5){
            const distAlngY = Math.abs(this.pos.y-p.y)
            if (distAlngY < this.sz*0.5){
                return true
            }
        }
        return false
    }
    checkBoundsRB(rb){
        let totPts = 0
        for (let i = 0; i < rb.pts.length; i++){
            if (this.checkBoundsPt(rb.pts[i].p)) totPts++
            console.log(totPts)
            if (totPts >= this.pRbIn) return true
        }
        return false
    }
    static testAllAndDel(tcans, objs, rbs){
        let dIndsO = []
        let dIndsR = []
        for (let i = objs.length-1; i >= 0; i--){//go backwards so nothing gets weird
            let deld = false
            tcans.forEach(tcan => {
                if (!deld && tcan.checkBoundsBall(objs[i])){
                    objs.splice(i,1)
                    dIndsO.push(i)
                    deld=true
                }
            })
        }
        for (let i = rbs.length-1; i >= 0; i--){
            let deld = false
            tcans.forEach(tcan => {
                if (!deld && tcan.checkBoundsRB(rbs[i])){
                    rbs.splice(i,1)
                    dIndsR.push(i)
                    deld=true
                }
            })
        }
        return {dIndsO, dIndsR}
    }
}