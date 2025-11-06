function addVec(v1, v2){
    return {x: v1.x+v2.x, y: v1.y+v2.y}
}
function subVec(v1, v2){
    return {x: v1.x-v2.x, y: v1.y-v2.y}
}
function multVec(v1, v2){
    return {x: v1.x*v2.x, y: v1.y*v2.y}
}
function divVec(v1, v2){
    return {x: v1.x/v2.x, y: v1.y/v2.y}
}
function multVecCon(v1, n){
    if (!v1.x){
        return {x:0,y:0}
    }
    return {x: v1.x*n, y: v1.y*n}
}
function divVecCon(v1, n){
    return {x: v1.x/n, y: v1.y/n}
}
function mag(v){
    return Math.sqrt(v.x**2+v.y**2)
}
function norm(v){
    return divVecCon(v, mag(v))
}
function getdist(a,b){
    return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2)
}
function v(x,y){return{x,y}}
function dot(a,b){
    return a.x*b.x+a.y*b.y
}
function abs(v){
    return {
        x: Math.abs(v.x),
        y: Math.abs(v.y)
    }
}
function RotR(v){
    return {x:v.y,y:-v.x}
}
function getAngleVecSNAP(a,b,cw){
    a.x*=-1
    b.x*=-1
    if (cw){
        const dt = b.x*a.x + b.y*a.y
        const det = b.x*a.y - b.y*a.x 
        return Math.atan2(-det, -dt)+Math.PI
    } else {

        const dt = a.x*b.x + a.y*b.y
        const det = a.x*b.y - a.y*b.x 
        return Math.atan2(-det, -dt)+Math.PI
    }
}
const quatcircle = 0.5*Math.PI
function getAngleVec(a,b,cw){
    a.x*=-1
    b.x*=-1
    let ang = 0
    if (cw){
        const dt = b.x*a.x + b.y*a.y
        const det = b.x*a.y - b.y*a.x 
        ang = Math.atan2(-det, -dt)+Math.PI
    } else {

        const dt = a.x*b.x + a.y*b.y
        const det = a.x*b.y - a.y*b.x 
        ang = Math.atan2(-det, -dt)+Math.PI
    }
    if (linDist(0, ang) <= quatcircle/5){
        ang = 0
    }
    if (linDist(quatcircle*4, ang) <= quatcircle/5){
        ang = quatcircle*4
    }
    if (linDist(quatcircle*2, ang) <= quatcircle/5){
        ang = quatcircle*2
    }
    if (linDist(quatcircle*3, ang) <= quatcircle/5){
        ang = quatcircle*3
    }
    return ang
}
function linDist(x1,x2){return Math.abs(x2-x1)}

/*linePoint(float a.x, float a.y, float b.x, float b.y, float px, float py) {

  // get distance from the point to the two ends of the line
  float d1 = dist(px,py, a.x,a.y);
  float d2 = dist(px,py, b.x,b.y);

  // get the length of the line
  float lineLen = dist(a.x,a.y, b.x,b.y);

  // since floats are so minutely accurate, add
  // a little buffer zone that will give collision
  float buffer = 0.1;    // higher # = less accurate

  // if the two distances are equal to the line's
  // length, the point is on the line!
  // note we use the buffer here to give a range,
  // rather than one #
  if (d1+d2 >= lineLen-buffer && d1+d2 <= lineLen+buffer) {
    return true;
  }
  return false;
} */

function RotR(v){
    v.x=v.y
    v.y=-v.x
    return v
}
function nrotr(v){
    v.x=-v.y
    v.y=v.x
    return v
}
function dot(a,b){
    return a.x*b.x+a.y*b.y
}