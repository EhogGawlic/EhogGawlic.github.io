
let a = 0
let t = 0
setInterval(()=>{
    saveData(btoa(encode()), 'save')
},sps.value*1000)
function run(){
    if (loading){
        const div = getEl("lrt")
        const r = t*200/250
        div.style.webkitTransform = 'rotate('+r+'deg)'; 
        div.style.mozTransform    = 'rotate('+r+'deg)'; 
        div.style.msTransform     = 'rotate('+r+'deg)'; 
        div.style.oTransform      = 'rotate('+r+'deg)'; 
        div.style.transform       = 'rotate('+r+'deg)'; 
    } else {
        getEl("main").style.display="block"
        getEl("lbg").style.display="none"
        getEl("lrt").style.display="none"
    }
    t++
    const ft = (thisLoop=Date.now()) - lastLoop
    frameTime+= (ft-frameTime)/filterS
    lastLoop = thisLoop
    pfps=fps
    fps=(1000/frameTime).toFixed(1)
    fpsEl.innerText=fps+" FPS"
    
    /*if (Math.round(fps/5)!==Math.round(pfps/5)){
        for (let i = 0; i < objs.length; i++){
            const mb = targetRate/fps
            const o = objs[i]
            o.vx = multVecCon(o.vx, mb)
            o.pp = subVec(o.p, o.vx)
        }
    }*/
    if (autoc.checked && (!paused||ceinp.checked)){
        if (a >= parseInt(acs.value)){
            for (let i = 0; i < parseInt(swi.value); i++){
                addObj(parseFloat(xinp.value)*meterPixRatio, parseFloat(yinp.value)*meterPixRatio+parseFloat(rinp.value)*meterPixRatio*i*4,
                parseFloat(rinp.value)*meterPixRatio,parseFloat(binp.value),
                HEXRGB(cinp.value),parseFloat(vxinp.value)*meterPixRatio,
                parseFloat(vyinp.value)*meterPixRatio, parseFloat(winp.value))
            }
            a=0
        }
        a++
    }
    ctx.clearRect(0,0,innerHeight,innerHeight)
    let dqueue = []
    objs.forEach(obj => {
        obj.draw()
        
        if (!paused){
            
            for (let i = 0; i < fans.length; i++){

                const f = fans[i]
                const p2 = addVec(f.p, f.dir)
                const d = ( ((obj.p.x-f.p.x)*(p2.x-f.p.x)) + ((obj.p.y-f.p.y)*(p2.y-f.p.y)) ) / dist(f.p, p2)**2;
                let cx = f.p.x + (d * (p2.x-f.p.x))
                let cy = f.p.y + (d * (p2.y-f.p.y))
                const dbcp = dist(obj.p, {x:cx,y:cy})
                const dfcp = dist(f.p, {x:cx,y:cy})
                /*try{
                const rfd = {x:Math.round(f.dir.x*100)*0.01,y:Math.round(f.dir.y*100)*0.01}
                const nbf = norm(subVec(f.p, {x:cx,y:cy}))
                const cfd = {x:Math.round(nbf.x*100)*0.01,y:Math.round(nbf.y*100)*0.01}*/
                if (dbcp <= 30 && dfcp <= f.md){// && rfd.x===cfd.x&&rfd.y===cfd.y){
                    obj.addForce(10, multVecCon(f.dir,f.s*f.md/(dfcp*f.md)))
                }
            //}catch(e){alert(e)}
            }
            tcans.forEach(tc => {
                
                if (obj.p.y-obj.r >= tc.y-30 && obj.p.y+obj.r <= tc.y+40 && obj.p.x-obj.r >= tc.x-30 && obj.p.x+obj.r <= tc.x+30){
                    dqueue.push(obj.n)
                }
            })
            obj.phys()
            
        }
    })
    polys.forEach(p => {
        p.phys()

    })
    for (let n = dqueue.length-1; n >= 0; n--){
        objs.splice(dqueue[n], 1)
        for (let i = 0; i < objs.length; i++){
            if (i>=dqueue[n]){
                objs[i].n--
            }
        }
    }
    
    ctx.strokeStyle="black"
    lines.forEach(l => {
        let x1 = l.p1.x
        let y1 = l.p1.y
        let x2 = l.p2.x
        let y2 = l.p2.y
        if (l.m.h){
            if(!paused){l.m.t+=l.m.s}
            const sp1 = subVec(l.p1,l.m.p)
            const sp2 = subVec(l.p2, l.m.p)
            x1 = sp1.x*Math.cos(l.m.t)-sp1.y*Math.sin(l.m.t)+l.m.p.x
            y1 = sp1.x*Math.sin(l.m.t)+sp1.y*Math.cos(l.m.t)+l.m.p.y
            x2 = sp2.x*Math.cos(l.m.t)-sp2.y*Math.sin(l.m.t)+l.m.p.x
            y2 = sp2.x*Math.sin(l.m.t)+sp2.y*Math.cos(l.m.t)+l.m.p.y
        }
        ctx.lineWidth = l.w
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.lineWidth = 1
    })
    ctx.fillStyle="gray"
    fans.forEach(f => {

        drawFan(f)
    })
    tcans.forEach(tcan => {
        ctx.drawImage(tcansrc, tcan.x-64, tcan.y-64, 128, 128)
    })
    let i = 0
    valves.forEach(v =>{
        if (i===parseInt(vninp.value)){
            ctx.strokeStyle = "blue"
            ctx.lineWidth = 2
        } else {
            ctx.strokeStyle = "black"
            ctx.lineWidth =1
        }
        ctx.fillStyle=`rgba(${v.c[0]},${v.c[1]},${v.c[2]},${v.o?0:100})`
        ctx.beginPath()
        ctx.arc(v.p.x,v.p.y,v.r,0,2*Math.PI)
        ctx.fill()
        ctx.stroke()
        i++
    })
    if (!paused || ceinp.checked){
        for (let n = 0; n < parseInt(substeps.value); n++){
            for (let i = 0; i < objs.length; i++){
                const obj = objs[i]
                obj.collall()
                if (!infspace){
                    obj.collwall()
                }
                obj.surfTens()
                obj.tb=[]
            }
        }
    }
    if (ml){
        switch(ltype){
            case 0:
                if (cn===1){
                    const snapped = snapLines(mx, my)
                    ctx.lineWidth = parseInt(lwinp.value)
                    ctx.beginPath()
                    ctx.moveTo(c1p.x,c1p.y)
                    ctx.lineTo(snapped.x,snapped.y)
                    ctx.stroke()
                    ctx.lineWidth = 1
                }
                break
            case 1:
                if (cn===2){
                    generateArcPrev(cc.x,cc.y,cs.x,cs.y,mx,my,parseFloat(lwinp.value),false)
                }
                break
            case 2:
                if (cn===2){
                    generateBezierPrev(cc.x,cc.y,cs.x,cs.y,mx,my,parseFloat(lwinp.value))
                }
        }
    }
    //
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    //
}
const loop = setInterval(run, 1000/targetRate)
abbtn.addEventListener("click", ()=>{
    addObj(parseFloat(xinp.value)*meterPixRatio, parseFloat(yinp.value)*meterPixRatio,
    parseFloat(rinp.value),parseFloat(binp.value),
    HEXRGB(cinp.value),parseFloat(vxinp.value),
    parseFloat(vyinp.value), parseFloat(winp.value))
})
window.addEventListener("keypress", (e) => {
    switch (e.key){
        case "c"||"Escape":
            selecting = false
            av = false 
            af = false 
            ml = false
            cn=0
            deleting=false
            ltype=0
            break
        case "l":

            ml = true
            canvas.style.cursor="crosshair"
            break
        case "f":
            af=true
            canvas.style.cursor="crosshair"
            break
        case " ":
            paused = paused ? false : true
            ppbtn.style.backgroundColor = paused ? "red" : "green"
            break
        case "k":
            paused = paused ? false : true
            ppbtn.style.backgroundColor = paused ? "red" : "green"
    }
})/*
getEl('post-content').addEventListener('change', function() {
    const text = this.value
    const title = document.getElementById("name").value
    const file = document.getElementById("file").value
    const filename = document.getElementById("filename").textContent
    const user = document.getElementById('username').value
    document.getElementById('post-preview').innerHTML = 
    `
    <h3>${title}</h3>
    <p>By ${user}</p><br>
    <p>${textToHTML(text)}</p>
    ${
        file.length ? `<br><a download="${filename}.psave" href="data:text/base64,+${encode()}">Download ${filename}</a>`: ``
    }`
});*/
canvas.addEventListener("contextmenu", (e)=>{
    e.preventDefault()
    xinp.value = mx/meterPixRatio
    yinp.value = my/meterPixRatio
})
canvas.addEventListener("dblclick", ()=>{
    seperateLines(mx,my)
})
canvas.addEventListener("mousedown", ()=>{
    clicking = true
})
canvas.addEventListener("mouseup", ()=>{
    clicking = false
})
canvas.addEventListener("mousemove", (e)=>{
    mx = Math.round((e.clientX-offX)*ma)
    my = Math.round(e.clientY*ma)
    if (clicking){

        const p = selectLinePoint(mx, my)

        p.forEach(point => {
            
            if (point.pn===0){
                lines[point.n].p1 = {x:mx,y:my}
            }
            if (point.pn===1){
                lines[point.n].p2 = {x:mx,y:my}
            }
        })
        if (!p.length){
            const sball = selectBall(mx, my)
            if (sball){
                const b = balls[sball]
                b.p.x=mx
                b.p.y=my
            }
        }
    }
})
window.onclick = (e)=>{
    //
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    //
    
    if (e.clientX>offX&&e.clientX<innerWidth-offX){
        if (!selecting && !ml && !av && !af && !deleting && !adding.ia){
            try{
            addObj(mx,my,
            parseFloat(rinp.value),parseFloat(binp.value),
            HEXRGB(cinp.value),parseFloat(vxinp.value),
            parseFloat(vyinp.value), parseFloat(winp.value))
            }catch(e){alert(e)}
            return
        }
        if (selecting && !ml && !av && !af && !deleting && !adding.ia){
            const s = select(mx, my)
            if (s!==false){
                if (sil===false){
                    objs[s].s = true
                }
                selected=s
                hidden.style.display = "block"

    canvas.style.cursor="crosshair"
            }  
        }
        if (ml && !selecting && !av && !af && !deleting && !adding.ia){
            switch(ltype){
                case 0:
                    switch(cn){
                        case 0:
                            
                            c1p = snapLines(mx, my)

                            cn++
                            break
                        case 1:
                            c2p = snapLines(mx, my)
                            addLine(parseInt(lwinp.value))
                            //lines[lines.length-1].m={h:true,p:{x:mx, y:my},t:0}
                    }
                    break
                case 1:
                    switch(cn){
                        case 0:
                            cc = snapLines(mx,my)
                            cn++
                            break
                        case 1:
                            cs = snapLines(mx, my)
                            cn=2
                            break
                        case 2:
                            generateArc(cc.x,cc.y,cs.x,cs.y,mx,my,parseFloat(lwinp.value),false)
                            cn=0
                            ltype=0
                            ml=false
                    }
                    break
                case 2:
                    switch(cn){
                        case 0:
                            cc = snapLines(mx,my)
                            cn++
                            break
                        case 1:
                            cs = snapLines(mx, my)
                            cn++
                            break
                        case 2:
                            generateBezier(cc.x,cc.y,cs.x,cs.y,mx,my,parseFloat(lwinp.value))
                            cn=0

                            ltype=0
                            ml=false
                    }
            }
        }
        if (av && !selecting && !af && !ml && !deleting && !adding.ia){
            valves.push({p:{x:mx, y:my},r:parseFloat(rinp.value)*meterPixRatio,c:HEXRGB(cinp.value),o:false})
            vninp.max = valves.length-1
            av=false
        }
        if (af && !selecting && !av && !ml && !deleting && !adding.ia){
            switch(cn){
                case 0:
                    fp = {x:mx,y:my}
                    cn++
                    break
                case 1:
                    addFan(fp.x, fp.y, parseFloat(fsinp.value), norm(subVec({x:mx,y:my}, fp)), {x:mx,y:my})
                    cn=0
                    af=false
            }
        }
        if (deleting && !selecting && !av && !ml && !af && !adding.ia){
            let selecteda
            const sb = selectBall(mx, my)
            if (sb!==undefined){ selecteda = sb; selecttype="ball" }
            const sv = selectValve(mx, my)
            if (sv!==undefined){ selecteda = sv; selecttype="valve" }
            const sf = selectFan(mx, my)
            if (sf!==undefined){ selecteda = sf; selecttype="fan" }
            const stc = selectTCan(mx, my)
            if (stc!==undefined){ selecteda = stc; selecttype="tcan" }
            //const sli = selectLine(mx, my)
            //if (sli!==undefined){ selecteda = sli; selecttype="line"}
            if (selecttype!=="none"){
                switch(selecttype){
                    case "ball":
                        objs.splice(selecteda, 1)
                        for (let i = 0; i < objs.length; i++){
                            if (i>=selecteda){
                                objs[i].n--
                            }
                        }
                        break
                    case "valve":
                        valves.splice(selecteda, 1)
                        vninp.max=valves.length-1
                        break
                    case "fan":
                        fans.splice(selecteda, 1)
                        break
                    case "tcan":
                        tcans.splice(selecteda, 1)
                        //break
                }
            }
            deleting=false
            selecttype="none"
        }
        if (!deleting && !selecting && !av && !ml && !af && adding.ia){
            switch(adding.t){
                case 1:
                    tcans.push({x:mx, y:my})
                    break
                case 2:
                    lines[lninp.value].m = {p:snapLines(mx,my),h:true,t:0,s:msinp.value*0.0174533/targetRate}
            }
            adding.ia=false

        }
    }
    //
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    //
}
rinp.addEventListener("change", ()=>{
    winp.value = (Math.PI*parseFloat(rinp.value)**2)*parseFloat(dinp.value)
})
dinp.addEventListener("change", ()=>{
    winp.value = (Math.PI*parseFloat(rinp.value)**2)*parseFloat(dinp.value)
})
presets.addEventListener("change", ()=>{
    switch(presets.value){
        case "sm":
            dinp.value=78.3
            cinp.value="#808080"
            binp.value=0.2
            liq = false
            stinp.value=0
            rinp.value=5
            break
        case "pla":
            dinp.value=12.5
            cinp.value="#F0F0F0"
            binp.value=0.8
            liq = false
            stinp.value=0
            rinp.value=5
            break
        case "fb":
            dinp.value=12.5
            cinp.value="#0080FF"
            binp.value=1
            liq = false
            stinp.value=0
            rinp.value=5
            break
        case "nb":
            dinp.value=12.5
            cinp.value="#FF6961"
            binp.value=0
            liq = false
            stinp.value=0
            rinp.value=5
            break
        case "w":
            dinp.value=9.98
            cinp.value="#004CFF"
            binp.value=0.05
            rinp.value=1
            vxinp.value=300
            vyinp.value=150
            acs.value=1
            liq = true
            stinp.value=72
            break
        case "m":
            dinp.value=135.46
            cinp.value="#B7B8B9"
            binp.value=0.05
            rinp.value=1
            vxinp.value=300
            vyinp.value=150
            acs.value=1
            liq = true
            stinp.value=72
            break
        case "sf":
            dinp.value=0.35
            cinp.value="#F9F9F9"
            binp.value=0.1
            liq = false
            rinp.value=5
            stinp.value=0
    }
    winp.value = (Math.PI*parseFloat(rinp.value)**2)*parseFloat(dinp.value)
    document.cookie = "btype=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie="btype=\""+presets.value+"\"; path=/;"
})
selectbtn.addEventListener("click", ()=>{
    if (selecting){
        selecting = false
        ball = null
        canvas.style.cursor = "crosshair"
    } else {
        selecting=true
        canvas.style.cursor = "grab"
    }

    selectbtn.style.backgroundColor = selecting ? "green" : "gray"
})
rbbtn.addEventListener("click", ()=>{
    if (!sil){
        objs.splice(selected, 1)
        for (let i = 0; i < objs.length; i++){
            if (i>=selected){
                objs[i].n--
            }
        }
    } else {
        lines.splice(selected, 1)
        for (let i = 0; i < lines.length; i++){
            if (i>=selected){
                lines[i].n--
            }
        }
    }
})
clearbtn.addEventListener("click", ()=>{
    objs=[]
    lines=[]
    valves=[]
    fans=[]
    tcans=[]
    ltype=0
    cn=0
    ml =false
    deleting=false
    adding.ia=false
})
albtn.addEventListener("click", ()=>{
    ml = true
    canvas.style.cursor="crosshair"
})
clearufbtn.addEventListener("click", ()=>{
    let deleted = []
    let i = 0
    objs.forEach(obj =>{
        if (!obj.f){
            deleted.push(i)
        }
        i++
    })
    for (let d = deleted.length; d > 0; d--){
        objs.splice(deleted[d-1], 1)
    }
})
okbtn.addEventListener("click", ()=>{
    switch(asinp.value){
        case "tc":
            
            adding.ia=true
            adding.t=1
            getEl("crv").style.display="none"
            getEl("mtr").style.display="none"
            break
        case "m":
            adding.ia=true
            adding.t=2
            getEl("crv").style.display="none"
            getEl("mtr").style.display="block"
            break
        case "curve":
            ml=true
            ltype=1
            canvas.style.cursor = "crosshair"
            getEl("crv").style.display="block"
            getEl("mtr").style.display="none"
    }
})
asinp.onchange = function(){
    switch(asinp.value){
        case "tc":
            getEl("crv").style.display="none"
            getEl("mtr").style.display="none"
            break
        case "m":
            getEl("crv").style.display="none"
            getEl("mtr").style.display="block"
            break
        case "curve":
            getEl("crv").style.display="block"
            getEl("mtr").style.display="none"
    }
}
savebtn.addEventListener("click", ()=>{
    savelnk.href="data:text/base64,"+btoa(encode())
    savelnk.click()
})
ppbtn.addEventListener("click", ()=>{
    paused = paused ? false : true
    ppbtn.style.backgroundColor = paused ? "red" : "green"
})
rstbtn.addEventListener("click", ()=>{
    
    decode(atob(saved))
})
avbtn.addEventListener("click", ()=>{
    av = true

    canvas.style.cursor="crosshair"
})
ocvbtn.addEventListener("click", ()=>{
    valves[parseInt(vninp.value)].o = valves[parseInt(vninp.value)].o ? false : true
})
afbtn.addEventListener("click", ()=>{
    af=true
})
scinp.addEventListener("change",()=>{
    objs=[]
    lines=[]
    valves=[]
    fans=[]
    tcans=[ ]
    cn=0
    ml =false

    switch(scinp.value){
        case "m":
            meterPixRatio = (innerHeight-52)/500
            break
        case "cm":
            meterPixRatio = (innerHeight-52)*0.5
            break
        case "mm":
            meterPixRatio = (innerHeight-52)*5
    }
})
dbtn.addEventListener("click", ()=>{
    deleting=true
})
grinp.addEventListener("change", ()=>{
    grav = grinp.value*9.8
    if (grinp.value === 0){
        grav=0
    }
})
stbtn.addEventListener("click", ()=>{
    paused = settings.style.display === "none" ? true : false
    settings.style.display = settings.style.display === "none" ? "block" : "none"
})
//setTimeout(()=>{document.body.firstChild.style.display="none"},5000)
sps.addEventListener("change", ()=>{
    saveData(sps.value, 'savespersec')
})
acb.oncclick = function(){
    ltype=1
}
window.addEventListener("beforeunload", ()=>{
    saveData(btoa(encode()),"save")
})
cresinp.addEventListener("change", ()=>{
    cres = cresinp.value
})
