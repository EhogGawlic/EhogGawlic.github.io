function addVector(data, vec){
    data.push(vec.x)
    data.push(vec.y)
}
function encodeNewFile(){
    const data = new Float32Array()
    data.push(0x0000)
    objs.forEach(obj => {
        data.push(obj.n)
        addVector(data, obj.p)
        addVector(data, obj.v)
        addVector(data, obj.pp)
        data.push(obj.r)
        data.push(obj.w)
        data.push(obj.b)
        data.push(obj.f)
        data.push(obj.liquid ? 1 : 0)
        data.push(obj.surftens)
        data.push(...obj.c)

        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    lines.forEach(l=>{
        ///lines.push({p1:c1p,p2:c2p,w:w, m:{h:false,p:{x:0,y:0},t:0},np1:c1p,np2:c2p,s:0.05, color:HEXRGB(clinp.value),rail:{has:false,kfs:[{sp:v(67,67),ep:v(100,67)}],t:0}})

        data.push(l.p1.x)
        data.push(l.p1.y)
        data.push(l.p2.x)
        data.push(l.p2.y)
        data.push(l.w)
        data.push(l.m.h ? 1 : 0)
        data.push(l.m.p.x)
        data.push(l.m.p.y)
        data.push(l.m.t)
        addVector(data, l.np1)
        addVector(data, l.np2)
        data.push(l.s)
        data.push(...l.color)
        
        data.push(0x7FFFFFFE)
    })
    /*fans.push({
        p:{x,y},
        s:speed,
        dir:d,
        md:dist({x,y},mp)
    }) */
    data.push(0x7FFFFFFF)
    fans.forEach(f=>{
        data.push(f.p.x)
        data.push(f.p.y)
        data.push(f.s)
        data.push(f.dir.x)
        data.push(f.dir.y)
        data.push(f.md)
        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    valves.forEach(v=>{
        // valves.push({p:{x:mx, y:my},r:parseFloat(rinp.value)*meterPixRatio,c:HEXRGB(cinp.value),o:false})
        addVector(data, v.p)
        data.push(v.r)
        data.push(...v.c)
        data.push(v.o ? 1 : 0)
        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    tcans.forEach(t=>{
        addVector(data, t)
    })
    data.push(0x7FFFFFFF)
    springs.forEach(s=>{
        //springs.push({b1,b2, l:dist(objs[b1].p, objs[b2].p)})
        data.push(s.b1)
        data.push(s.b2)
        data.push(s.l)
        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    let blobData = new Blob([data], {type: 'application/octet-stream'})
    return blobData
}
function downloadFile(blob){
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pSave.psv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}
/**
 * 
 * @param {Float32Array} arr 
 */
function decodeNewFile(data){
    const arr = Array.from(data)
    if (arr[0] == 0){
        {
            const balls = arr.slice(1, arr.indexOf(0x7FFFFFFF))
            let ballReadArr = [[]]
            let last = ballReadArr[0]
            for (let i = 0; i < balls.length; i++){
                if (balls[i] == 0x7FFFFFFE){
                    ballReadArr.push([])
                    last = ballReadArr[ballReadArr.length-1]
                }
                else{
                    last.push(balls[i])
                }
            }
            ballReadArr.pop()
            ballReadArr.forEach(b=>{
                const nb = new Obj(
                    b[1],b[2],b[7],[b[13],b[14],b[15]],b[8],b[3]/(meterPixRatio/targetRate),b[4]/(meterPixRatio/targetRate),b[9],b[11] ==1 ? true:false,b[12],b[10]
                )
                objs.push(nb)
            })
        }
        let sl = arr.indexOf(0x7FFFFFFF, arr.indexOf(0x7FFFFFFF)+1)
        {
            const linesData = arr.slice(arr.indexOf(0x7FFFFFFF)+1, sl)
            let lineReadArr = [[]]
            let last = lineReadArr[0]
            for (let i = 0; i < linesData.length; i++){
                if (linesData[i] == 0x7FFFFFFE){
                    lineReadArr.push([])
                    last = lineReadArr[lineReadArr.length-1]
                }
                else{
                    last.push(linesData[i])
                }
            }
            lineReadArr.pop()
            lineReadArr.forEach(l=>{
                lines.push({p1:vec(l[0],l[1]),p2:vec(l[2],l[3]),w:l[4], m:{h:l[5] == 1 ? true:false,p:vec(l[6],l[7]),t:l[8]},np1:vec(l[9],l[10]),np2:vec(l[11],l[12]),s:l[13], color:[l[14],l[15],l[16]],rail:{has:false,kfs:[{sp:v(67,67),ep:v(100,67)}],t:0}})
            })
            sl = arr.indexOf(0x7FFFFFFF, sl+1)
        }
        {
            const fdata = arr.slice(arr.indexOf(0x7FFFFFFF)+1, sl)
            let fanReadArr = [[]]
            let last = fanReadArr[0]
            for (let i = 0; i < fdata.length; i++){
                if (fdata[i] == 0x7FFFFFFE){
                    fanReadArr.push([])
                    last = fanReadArr[fanReadArr.length-1]
                }
                else{
                    last.push(fdata[i])
                }
            }
            fanReadArr.pop()
            fanReadArr.forEach(f=>{
                fans.push({
                    p:{x:f[0],y:f[1]},
                    s:f[2],
                    dir:{x:f[3],y:f[4]},
                    md:f[5]
                })
            })
            sl = arr.indexOf(0x7FFFFFFF, sl+1)
            //good enough lets stop
        }
        /*fans.forEach(f=>{
        data.push(f.p.x)
        data.push(f.p.y)
        data.push(f.s)
        data.push(f.dir.x)
        data.push(f.dir.y)
        data.push(f.md)
        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    valves.forEach(v=>{
        // valves.push({p:{x:mx, y:my},r:parseFloat(rinp.value)*meterPixRatio,c:HEXRGB(cinp.value),o:false})
        addVector(data, v.p)
        data.push(v.r)
        data.push(...v.c)
        data.push(v.o ? 1 : 0)
        data.push(0x7FFFFFFE)
    })
    data.push(0x7FFFFFFF)
    tcans.forEach(t=>{
        addVector(data, t)
    })
    data.push(0x7FFFFFFF)
    springs.forEach(s=>{
        //springs.push({b1,b2, l:dist(objs[b1].p, objs[b2].p)})
        data.push(s.b1)
        data.push(s.b2)
        data.push(s.l)
        data.push(0x7FFFFFFE)
    })*/
    }
}