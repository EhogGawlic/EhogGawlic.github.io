export class Vec2{
    constructor(x,y){ this.x=x;this.y=y}
}
export class Vec3{
    constructor(x,y,z){ this.x=x;this.y=y;this.z=z}
}
export function addVec2(v1, v2){
    return new Vec2(v1.x+v2.x, v1.y+v2.y)
}
export function addVec3(v1, v2){
    return new Vec3(v1.x+v2.x, v1.y+v2.y,v1.z+v2.z)
}
export function subVec2(v1, v2){
    return new Vec2(v1.x-v2.x, v1.y-v2.y)
}
export function subVec3(v1, v2){
    return new Vec3(v1.x-v2.x, v1.y-v2.y,v1.z-v2.z)
}
export function multVec2(v1, v2){
    return new Vec2(v1.x*v2.x, v1.y*v2.y)
}
export function multVec3(v1, v2){
    return new Vec3(v1.x*v2.x, v1.y*v2.y,v1.z*v2.z)
}
export function divVec2(v1, v2){
    return new Vec2(v1.x/v2.x, v1.y/v2.y)
}
export function divVec3(v1, v2){
    return new Vec3(v1.x/v2.x, v1.y/v2.y,v1.z/v2.z)
}
export function multVec22(v1, n){
    return new Vec2(v1.x*n, v1.y*n)
}
export function multVec32(v1, n){
    return new Vec3(v1.x*n, v1.y*n,v1.z*n)
}
export function divVec22(v1, n){
    return new Vec2(v1.x/n, v1.y/n)
}
export function divVec32(v1, n){
    return new Vec3(v1.x/n, v1.y/n,v1.z/n)
}
export function mag2(v){
    return Math.sqrt(v.x**2+v.y**2)
}
export function mag3(v){
    return Math.sqrt(v.x**2+v.y**2+v.z**2)
}
export function norm2(v){
    return divVec22(v,mag2(v))
}
export function norm3(v){
    return divVec32(v,mag3(v))
}
export function dist2(p1, p2){
    return mag2(subVec2(p2, p1))
}
export function dist3(p1, p2){
    return mag3(subVec3(p2, p1))
}
export function URD2(v){ //un-rooted distance vec2
    return v.x**2+v.y**2
}
export function URD3(v){ //un-rooted distance vec3
    return v.x**2+v.y**2+v.z**2
}
export function dot2(v1,v2){
    return v1.x*v2.x+v1.y*v2.y
}
export function dot3(v1,v2){
    return v1.x*v2.x+v1.y*v2.y+v1.z*v2.z
}
export function reflect2(incoming, normal){
    const dp = dot2(incoming, normal)
    const mp = multVec22(dp, 2)
    const lp = multVec2(mp,normal)
    return subVec2(incoming,lp)
}
export function reflect3(incoming, normal){
    const dp = dot3(incoming, normal)
    const mp = multVec32(dp, 2)
    const lp = multVec3(mp,normal)
    return subVec3(incoming,lp)
}