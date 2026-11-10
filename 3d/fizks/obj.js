import {Vec2, Vec3, addVec2,addVec3,subVec2,subVec3,multVec2,multVec3,divVec2,divVec3,multVec22,multVec32,divVec22,divVec32,dist2, dist3, URD2, URD3, norm2, norm3, dot2, dot3, reflect2, reflect3} from "./vec.js"


export class Obj2{
    static nextId = 0
    constructor(options){
        this.p = new Vec2(0,0)
        this.v = new Vec2(0,0)
        this.a = new Vec2(0,0)
        this.c = [255, 255, 255]
        this.p.x = Object.hasOwn(options, "x") ? options.x : 0
        this.p.y = Object.hasOwn(options, "y") ? options.y : 0
        this.v.x = Object.hasOwn(options, "vx") ? options.vx : 0
        this.v.y = Object.hasOwn(options, "vy") ? options.vy : 0
        this.a.x = Object.hasOwn(options, "ax") ? options.ax : 0
        this.a.y = Object.hasOwn(options, "ay") ? options.ay : 0
        this.c[0] = Object.hasOwn(options, "red") ? options.red : 255
        this.c[1] = Object.hasOwn(options, "green") ? options.green : 255
        this.c[2] = Object.hasOwn(options, "blue") ? options.blue : 255
        this.r = Object.hasOwn(options, "rad") ? options.rad : 5
        this.bounce = Object.hasOwn(options, "bounce") ? options.bounce : 0.5
        this.f = Object.hasOwn(options, "fixed") ? options.fixed : false
        this.m = Object.hasOwn(options, "mass") ? options.mass : 10
        this.pp=subVec2(this.p,this.v)
        this.id = Obj2.nextId++
        this.cx = 0; this.cy = 0
    }
    collideWalls(type,...wallps){
        switch(type){
            case "circle":
                const wcent = new Vec2(wallps[0],wallps[1])
                const DFC = dist2(this.p,wcent)+this.r
                if (DFC > wallps[2]){
                    const DFW = DFC-wallps[2]
                    const norm = norm2(subVec2(wcent, this.p))
                    const pushback = multVec22(norm,DFW)
                    this.p = addVec2(this.p,pushback)
                    const normMag = dotVec2(this.v, norm)
                    const normVec = multVec22(norm, normMag)
                    const tangVec = subVec2(this.v, normVec)
                    const normRef = multVec22(normVec, -this.bounce)
                    this.v = addVec2(tangVec, normRef)
                    this.pp = subVec2(this.p, this.v)
                }
                break
            case "square":
                const lwall = wallps[0]
                const twall = wallps[1]
                const rwall = wallps[2]
                const bwall = wallps[3]
                const vx = this.p.x - this.pp.x
                const vy = this.p.y - this.pp.y
                if (this.p.x < lwall + this.r) {
                    this.p.x = lwall + this.r
                    this.pp.x = this.p.x - (vx < 0 ? -vx * this.bounce : vx)
                }
                if (this.p.x > rwall - this.r) {
                    this.p.x = rwall - this.r
                    this.pp.x = this.p.x - (vx > 0 ? -vx * this.bounce : vx)
                }
                if (this.p.y < twall+this.r){
                    this.p.y = twall+this.r
                    this.pp.y = this.p.y - (vy < 0 ? -vy * this.bounce : vy)
                }
                if (this.p.y > bwall-this.r){
                    this.p.y = bwall-this.r
                    this.pp.y = this.p.y - (vy > 0 ? -vy * this.bounce : vy)
                }
        }
    }
    static collideBalls(b1, b2){
        if (b1.f && b2.f) return

        const urd = URD2(subVec2(b2.p, b1.p))
        const combinedRad = b1.r + b2.r
        if (urd == 0) return
        if (urd < combinedRad ** 2){
            const dist = Math.sqrt(urd)
            const norm = norm2(subVec2(b2.p, b1.p))
            
            const b1v = subVec2(b1.p, b1.pp)
            const b2v = subVec2(b2.p, b2.pp)

            const overlap = combinedRad - dist
            let s1 = 0, s2 = 0
            if (b1.f)      s2 = overlap
            else if (b2.f) s1 = overlap
            else {
                const totMass = b1.m + b2.m
                s1 = overlap * b2.m / totMass
                s2 = overlap * b1.m / totMass
            }
            const d1 = multVec22(norm, -s1)
            const d2 = multVec22(norm,  s2)
            b1.p = addVec2(b1.p, d1);  b1.pp = addVec2(b1.pp, d1)
            b2.p = addVec2(b2.p, d2);  b2.pp = addVec2(b2.pp, d2)

            const e = (b1.bounce + b2.bounce) * 0.5
            const v1n = b1v.x * norm.x + b1v.y * norm.y
            const v2n = b2v.x * norm.x + b2v.y * norm.y

            if (v1n - v2n > 0) {
                if (b1.f) {
                    const impulse = -(1 + e) * v2n
                    b2.pp = subVec2(b2.pp, multVec22(norm, impulse))
                } else if (b2.f) {
                    const impulse = -(1 + e) * v1n
                    b1.pp = subVec2(b1.pp, multVec22(norm, impulse))
                } else {
                    const totMass = b1.m + b2.m
                    const relVelNorm = v1n - v2n
                    const impulseMag = ((1 + e) * relVelNorm) / totMass
                    b1.pp = addVec2(b1.pp, multVec22(norm, impulseMag * b2.m))
                    b2.pp = subVec2(b2.pp, multVec22(norm, impulseMag * b1.m))
                }
            }
        }
    }

    integrate(gravity){
        if (this.f) return
        this.a.y = gravity
        this.v=divVec22(addVec2(subVec2(this.p, this.pp), this.a), 1)
        this.pp=this.p
        this.p = addVec2(this.p, this.v)
    }

    static collideAll(objs) {
        const n = objs.length
        if (n === 0) return

        let maxRadius = 0
        for (let i = 0; i < n; i++) {
            if (objs[i].r > maxRadius) maxRadius = objs[i].r
        }
        const inv = 1 / (maxRadius * 2)

        // build grid with numeric keys
        const grid = new Map()
        for (let i = 0; i < n; i++) {
            const o = objs[i]
            const cx = Math.floor(o.p.x * inv)
            const cy = Math.floor(o.p.y * inv)
            o.cx = cx; o.cy = cy;
            const key = (cx + 512) + (cy + 512) * 1048576
            const cell = grid.get(key)
            if (cell === undefined) grid.set(key, [o])
            else cell.push(o)
        }

        for (let i = 0; i < n; i++) {
            const a = objs[i]
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = (a.cx + dx + 512) + (a.cy + dy + 512) * 1048576
                    const cell = grid.get(key)
                    if (cell === undefined) continue
                    for (let j = 0; j < cell.length; j++) {
                        const b = cell[j]
                        if (b.id > a.id) Obj2.collideBalls(a, b)
                    }
                }
            }
        }
    }
    clone() {
        const copy = Object.assign(Object.create(Obj2.prototype), this)
        copy.p = new Vec2(this.p.x, this.p.y)
        copy.v = new Vec2(this.v.x, this.v.y)
        copy.a = new Vec2(this.a.x, this.a.y)
        copy.pp = new Vec2(this.pp.x, this.pp.y)
        copy.c = this.c.slice()
        copy.id = Obj2.nextId++
        return copy
    }

}

export class Obj3{
    static nextId = 0
    constructor(options){
        this.p = new Vec3(0,0,0)
        this.v = new Vec3(0,0,0)
        this.a = new Vec3(0,0,0)
        this.c = [255,255,255]
        this.p.x = Object.hasOwn(options, "x") ? options.x : 0
        this.p.y = Object.hasOwn(options, "y") ? options.y : 0
        this.p.z = Object.hasOwn(options, "z") ? options.z : 0
        this.v.x = Object.hasOwn(options, "vx") ? options.vx : 0
        this.v.y = Object.hasOwn(options, "vy") ? options.vy : 0
        this.v.z = Object.hasOwn(options, "vz") ? options.vz : 0
        this.a.x = Object.hasOwn(options, "ax") ? options.ax : 0
        this.a.y = Object.hasOwn(options, "ay") ? options.ay : 0
        this.a.z = Object.hasOwn(options, "az") ? options.az : 0
        this.c[0] = Object.hasOwn(options, "red") ? options.red : 255
        this.c[1] = Object.hasOwn(options, "green") ? options.green : 255
        this.c[2] = Object.hasOwn(options, "blue") ? options.blue : 255
        this.r = Object.hasOwn(options, "rad") ? options.rad : 5
        this.bounce = Object.hasOwn(options, "bounce") ? options.bounce : 0.5
        this.f = Object.hasOwn(options, "fixed") ? options.fixed : false
        this.m = Object.hasOwn(options, "mass") ? options.mass : 20
        this.pp=subVec3(this.p,this.v)
        this.id = Obj3.nextId++
        this.cx = 0; this.cy = 0; this.cz = 0
    }
    collideWalls(type,...wallps){
        switch(type){
            case "circle":
                const wcent = new Vec3(wallps[0],wallps[1],wallps[2])
                const DFC = dist3(this.p,wcent)+this.r
                if (DFC > wallps[3]){
                    const DFW = DFC-wallps[3]
                    const norm = norm3(subVec3(wcent, this.p))
                    const pushback = multVec32(norm,DFW)
                    this.p = addVec3(this.p,pushback)
                    const normMag = dotVec3(this.v, norm)
                    const normVec = multVec32(norm, normMag)
                    const tangVec = subVec3(this.v, normVec)
                    const normRef = multVec32(normVec, -this.bounce)
                    this.v = addVec3(tangVec, normRef)
                    this.pp = subVec3(this.p, this.v)
                }
                break
            case "square":
                const lwall  = wallps[0]
                const twall  = wallps[1]
                const rwall  = wallps[2]
                const bwall  = wallps[3]
                const fwall  = wallps[4]
                const bkwall = wallps[5]
                
                const vx = this.p.x - this.pp.x
                const vy = this.p.y - this.pp.y
                const vz = this.p.z - this.pp.z
                if (this.p.x < lwall + this.r) {
                    this.p.x = lwall + this.r
                    this.pp.x = this.p.x - (vx < 0 ? -vx * this.bounce : vx)
                }
                if (this.p.x > rwall - this.r) {
                    this.p.x = rwall - this.r
                    this.pp.x = this.p.x - (vx > 0 ? -vx * this.bounce : vx)
                }
                if (this.p.y < twall+this.r){
                    this.p.y = twall+this.r
                    this.pp.y = this.p.y - (vy < 0 ? -vy * this.bounce : vy)
                }
                if (this.p.y > bwall-this.r){
                    this.p.y = bwall-this.r
                    this.pp.y = this.p.y - (vy > 0 ? -vy * this.bounce : vy)
                }
                if (this.p.z < fwall+this.r){
                    this.p.z = fwall+this.r
                    this.pp.z = this.p.z - (vz < 0 ? -vz * this.bounce : vz)
                }
                if (this.p.z > bkwall-this.r){
                    this.p.z = bkwall-this.r
                    this.pp.z = this.p.z - (vz > 0 ? -vz * this.bounce : vz)
                }
        }
    }
    static collideBalls(b1, b2){
        if (b1.f && b2.f) return

        const urd = URD3(subVec3(b2.p, b1.p))
        const combinedRad = b1.r + b2.r
        if (urd == 0) return

        if (urd < combinedRad ** 2){
            const dist = Math.sqrt(urd)
            const norm = norm3(subVec3(b2.p, b1.p))
            
            const b1v = subVec3(b1.p, b1.pp)
            const b2v = subVec3(b2.p, b2.pp)

            const overlap = combinedRad - dist
            let s1 = 0, s2 = 0
            if (b1.f)      s2 = overlap
            else if (b2.f) s1 = overlap
            else {
                const totMass = b1.m + b2.m
                s1 = overlap * b2.m / totMass
                s2 = overlap * b1.m / totMass
            }
            const d1 = multVec32(norm, -s1)
            const d2 = multVec32(norm,  s2)
            b1.p = addVec3(b1.p, d1);  b1.pp = addVec3(b1.pp, d1)
            b2.p = addVec3(b2.p, d2);  b2.pp = addVec3(b2.pp, d2)

            const e = (b1.bounce + b2.bounce) * 0.5
            const v1n = b1v.x * norm.x + b1v.y * norm.y + b1v.z * norm.z
            const v2n = b2v.x * norm.x + b2v.y * norm.y + b2v.z * norm.z

            if (v1n - v2n > 0) {
                if (b1.f) {
                    const impulse = -(1 + e) * v2n
                    b2.pp = subVec3(b2.pp, multVec32(norm, impulse))
                } else if (b2.f) {
                    const impulse = -(1 + e) * v1n
                    b1.pp = subVec3(b1.pp, multVec32(norm, impulse))
                } else {
                    const totMass = b1.m + b2.m
                    const relVelNorm = v1n - v2n
                    const impulseMag = ((1 + e) * relVelNorm) / totMass
                    b1.pp = addVec3(b1.pp, multVec32(norm, impulseMag * b2.m))
                    b2.pp = subVec3(b2.pp, multVec32(norm, impulseMag * b1.m))
                }
            }
        }
    }
    integrate(gravity){
        if (this.f) return
        this.a.y = gravity
        this.v=divVec32(addVec3(subVec3(this.p, this.pp), this.a), 1)
        this.pp=this.p
        this.p = addVec3(this.p, this.v)
        
    }
    static collideAll(objs) {
        const n = objs.length
        if (n === 0) return

        let maxRadius = 0
        for (let i = 0; i < n; i++) {
            if (objs[i].r > maxRadius) maxRadius = objs[i].r
        }
        const inv = 1 / (maxRadius * 2)

        // build grid with numeric keys
        const grid = new Map()
        for (let i = 0; i < n; i++) {
            const o = objs[i]
            const cx = Math.floor(o.p.x * inv)
            const cy = Math.floor(o.p.y * inv)
            const cz = Math.floor(o.p.z * inv)
            o.cx = cx; o.cy = cy; o.cz = cz
            const key = (cx + 512) + (cy + 512) * 1024 + (cz + 512) * 1048576
            const cell = grid.get(key)
            if (cell === undefined) grid.set(key, [o])
            else cell.push(o)
        }

        // each pair is handled once: only from the lower id to the higher id
        for (let i = 0; i < n; i++) {
            const a = objs[i]
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const key = (a.cx + dx + 512) + (a.cy + dy + 512) * 1024 + (a.cz + dz + 512) * 1048576
                        const cell = grid.get(key)
                        if (cell === undefined) continue
                        for (let j = 0; j < cell.length; j++) {
                            const b = cell[j]
                            if (b.id > a.id) Obj3.collideBalls(a, b)
                        }
                    }
                }
            }
        }
    }
    clone() {
        const copy = Object.assign(Object.create(Obj3.prototype), this)
        copy.p = new Vec3(this.p.x, this.p.y, this.p.z)
        copy.v = new Vec3(this.v.x, this.v.y, this.v.z)
        copy.a = new Vec3(this.a.x, this.a.y, this.a.z)
        copy.pp = new Vec3(this.pp.x, this.pp.y, this.pp.z)
        copy.c = this.c.slice()
        copy.id = Obj3.nextId++
        return copy
    }
}