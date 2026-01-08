function addVector(data, vec){
    data.push(vec.x)
    data.push(vec.y)
}
const SEP = -999999;
const ITEM = -999998;

function encodeNewFile(){
    const data = []//new Float32Array()
    data.push(0x0002)
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

        data.push(SEP)
    })
    data.push(ITEM)
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
        
        data.push(SEP)
    })
    /*fans.push({
        p:{x,y},
        s:speed,
        dir:d,
        md:dist({x,y},mp)
    }) */
    data.push(ITEM)
    fans.forEach(f=>{
        data.push(f.p.x)
        data.push(f.p.y)
        data.push(f.s)
        data.push(f.dir.x)
        data.push(f.dir.y)
        data.push(f.md)
        data.push(SEP)
    })
    data.push(ITEM)
    valves.forEach(v=>{
        // valves.push({p:{x:mx, y:my},r:parseFloat(rinp.value)*meterPixRatio,c:HEXRGB(cinp.value),o:false})
        addVector(data, v.p)
        data.push(v.r)
        data.push(...v.c)
        data.push(v.o ? 1 : 0)
        data.push(SEP)
    })
    data.push(ITEM)
    tcans.forEach(t=>{
        addVector(data, t)
    })
    data.push(ITEM)
    springs.forEach(s=>{
        //springs.push({b1,b2, l:dist(objs[b1].p, objs[b2].p)})
        data.push(s.b1)
        data.push(s.b2)
        data.push(s.l)
        data.push(SEP)
    })
    data.push(ITEM)
    data.push(parseFloat(xinp.value))
    data.push(parseFloat(yinp.value))
    data.push(parseFloat(rinp.value))
    data.push(parseFloat(dinp.value))
    data.push(parseFloat(vxinp.value))
    data.push(parseFloat(vyinp.value))
    data.push(parseFloat(dinp.value))
    data.push(parseFloat(substeps.value))
    data.push(inf ? 1 : 0)
    data.push(sbreak.checked ? 1 : 0)
    data.push(255) //padding to prevent cutoff
    return data
}
function downloadFile(arr){
    const url = URL.createObjectURL(new Blob([new Float32Array(arr)], {type: 'application/octet-stream'}))
    console.log(url)
    const a = document.createElement('a')
    a.href = url
    a.download = savename.value+'.psv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}
/**
 * 
 * @param {ArrayBuffer} arr 
 */
function decodeNewFile(data){
    const arr = Array.from(new Float32Array(data))
        let idx = 1
    if (arr[0] == 0 || arr[0] == 0x0001 || arr[0] == 0x0002){
        {
            const ballsEnd = arr.indexOf(ITEM, idx)
            const balls = arr.slice(idx, ballsEnd)
            idx = ballsEnd + 1
            let ballReadArr = [[]]
            let last = ballReadArr[0]
            for (let i = 0; i < balls.length; i++){
                if (balls[i] == SEP){
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
        {
            const linesEnd = arr.indexOf(ITEM, idx)
            const linesData = arr.slice(idx, linesEnd)
            idx = linesEnd + 1

            let lineReadArr = [[]]
            let last = lineReadArr[0]
            for (let i = 0; i < linesData.length; i++){
                if (linesData[i] == SEP){
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
        }
        {
            const fansEnd = arr.indexOf(ITEM, idx)
            const fdata = arr.slice(idx, fansEnd)
            idx = fansEnd + 1

            let fanReadArr = [[]]
            let last = fanReadArr[0]
            for (let i = 0; i < fdata.length; i++){
                if (fdata[i] == SEP){
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
            //good enough lets 𝗻𝗼𝘁 stop
        }
        {
            const valvesEnd = arr.indexOf(ITEM, idx)
            const vdata = arr.slice(idx, valvesEnd)
            idx = valvesEnd + 1

            let valveReadArr = [[]]
            let last = valveReadArr[0]
            for (let i = 0; i < vdata.length; i++){
                if (vdata[i] == SEP){
                    valveReadArr.push([])
                    last = valveReadArr[valveReadArr.length-1]
                }
                else{
                    last.push(vdata[i])
                }
            }
            valveReadArr.pop()
            valveReadArr.forEach(v=>{
                valves.push({p:{x:v[0],y:v[1]},r:v[2],c:[v[3],v[4],v[5]],o:v[6] == 1 ? true:false})
            })
        }
        {
            const trashEnd = arr.indexOf(ITEM, idx)
            const tdata = arr.slice(idx, trashEnd)
            idx = trashEnd + 1

            let trashReadArr = [[]]
            let last = trashReadArr[0]
            for (let i = 0; i < tdata.length; i++){
                if (tdata[i] == SEP){
                    trashReadArr.push([])
                    last = trashReadArr[trashReadArr.length-1]
                }
                else{
                    last.push(tdata[i])
                }
            }
            trashReadArr.pop()
            trashReadArr.forEach(v=>{
                tcans.push(vec(v[0],v[1]))
            })
        }
        {
            const springEnd = arr.indexOf(ITEM, idx)
            const sdata = arr.slice(idx, springEnd)
            idx = springEnd + 1

            let springReadArr = [[]]
            let last = springReadArr[0]
            for (let i = 0; i < sdata.length; i++){
                if (sdata[i] == SEP){
                    springReadArr.push([])
                    last = springReadArr[springReadArr.length-1]
                }
                else{
                    last.push(sdata[i])
                }
            }
            springReadArr.pop()
            springReadArr.forEach(s=>{
                springs.push({b1:s[0],b2:s[1],l:s[2]})
            })
        }
    }
    if (arr[0] == 0x0001 || arr[0] == 0x0002){
        const metaEnd = arr.indexOf(ITEM, idx)
        const mdata = arr.slice(idx, metaEnd)
        idx = metaEnd + 1
        xinp.value = mdata[0]
        yinp.value = mdata[1]
        rinp.value = mdata[2]
        dinp.value = mdata[3]
        vxinp.value = mdata[4]
        vyinp.value = mdata[5]
        dinp.value = mdata[6]
        if (mdata[7]){
            substeps.value = mdata[7]
        }
        if (mdata[8] !== null && mdata[8] !== undefined){
            inf = mdata[8] == 1 ? true:false
            getEl("infcheck").checked = inf
        } else {
            objs.forEach(o=>{
                if (o.p.y > 500*meterPixRatio){
                    inf = true
                    getEl("infcheck").checked = true
                }
            })
        }
        if (arr[0] == 0x0002){
            sbreak.checked = mdata[8] == 1 ? true:false
        }
    }
}
async function listDirectory(path){
    const resp = await fetch(path)
    const text = await resp.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, "text/html")
    const links = Array.from(doc.querySelectorAll("a"))
    return links.map(a=>a.getAttribute("href"))
}