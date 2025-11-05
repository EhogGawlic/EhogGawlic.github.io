let a = 0
let t = 0

setInterval(()=>{
    setCloudData()
    saveData(getEl("infcheck").checked ? "true" : "", "infspace")
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
    for (let i = 0; i < ms; i++){
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
                if (obj.p.y >= 6700*meterPixRatio){
                    dqueue.push(obj.n)
                }
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
            if (l.color){
                ctx.strokeStyle=`rgb(${l.color[0]},${l.color[1]},${l.color[2]})`
            } else {
                ctx.strokeStyle="black"
            }
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
            ctx.moveTo(x1+emv.x, y1+emv.y)
            ctx.lineTo(x2+emv.x, y2+emv.y)
            ctx.stroke()
            ctx.lineWidth = 1
        })
        ctx.fillStyle="gray"
        fans.forEach(f => {

            drawFan(f)
        })
        tcans.forEach(tcan => {
            ctx.drawImage(tcansrc, tcan.x-64+emv.x, tcan.y-64+emv.y, 128, 128)
        })
        ropes.forEach(rope=>{
            const b1 = objs[rope.b1]
            const b2 = objs[rope.b2]
            ctx.strokeStyle="brown"
            ctx.lineWidth=2
            ctx.beginPath()
        ctx.moveTo(b1.p.x + emv.x, b1.p.y + emv.y)
            ctx.lineTo(b2.p.x+emv.x, b2.p.y+emv.y)
            ctx.stroke()
            ctx.lineWidth=1
        })
springs.forEach(rope=>{
            const b1 = objs[rope.b1]
            const b2 = objs[rope.b2]
            ctx.strokeStyle="yellow"
            ctx.lineWidth=2
            ctx.beginPath()
        ctx.moveTo(b1.p.x + emv.x, b1.p.y + emv.y)
            ctx.lineTo(b2.p.x+emv.x, b2.p.y+emv.y)
            ctx.stroke()
            ctx.lineWidth=1
        })
        bars.forEach(rope=>{
            const b1 = objs[rope.b1]
            const b2 = objs[rope.b2]
            ctx.strokeStyle="gray"
            ctx.lineWidth=2
            ctx.beginPath()
        ctx.moveTo(b1.p.x + emv.x, b1.p.y + emv.y)
            ctx.lineTo(b2.p.x+emv.x, b2.p.y+emv.y)
            ctx.stroke()
            ctx.lineWidth=1
        })

    inf = getEl("infcheck").checked
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
            ctx.arc(v.p.x+emv.x,v.p.y+emv.y,v.r,0,2*Math.PI)
            ctx.fill()
            ctx.stroke()
            i++
        })
        if (!paused || ceinp.checked){
            for (let n = 0; n < parseInt(substeps.value); n++){
                for (let i = 0; i < objs.length; i++){
                    const obj = objs[i]
                    obj.collall()
                    obj.collwall()
                    obj.surfTens()
                    obj.tb=[]
                }
                // relax constraints iteratively to improve stability
                const constraintIters = parseInt(substeps.value)
                for (let iter = 0; iter < constraintIters; iter++){
                    ropes.forEach(rope=>{
                        const b1 = objs[rope.b1]
                        const b2 = objs[rope.b2]
                        const d = dist(b1.p, b2.p)
                        const diff = Math.min(0,rope.l - d)
                        const dir = norm(subVec(b2.p, b1.p))
                        const force = multVecCon(dir, diff*0.5)
                        b1.pp = addVec(b1.pp, force)
                        b2.pp = subVec(b2.pp, force)
                        if (diff === 0) return

                        // remove any inward relative velocity introduced by the correction
                        // so the rope doesn't cause a rebound (make the constraint inelastic)
                        const v1 = subVec(b1.p, b1.pp)
                        const v2 = subVec(b2.p, b2.pp)
                        const relVel = (v2.x - v1.x) * dir.x + (v2.y - v1.y) * dir.y
                        if (relVel < 0){
                            const m1 = (b1.m !== undefined) ? b1.m : 1
                            const m2 = (b2.m !== undefined) ? b2.m : 1
                            const invSum = 1 / (m1 + m2)
                            // maximum allowed rebound velocity (pixels/frame) derived from gravity
                            const maxBounce = Math.abs(grav)// * meterPixRatio / targetRate
                            const correctionVel = Math.min(-relVel, maxBounce)
                            const dp1 = multVecCon(dir, correctionVel * (m2 * invSum))
                            const dp2 = multVecCon(dir, -correctionVel * (m1 * invSum))
                            b1.pp = addVec(b1.pp, dp1)
                            b2.pp = addVec(b2.pp, dp2)
                        }
                    })

                    springs.forEach(rope=>{
                        const b1 = objs[rope.b1]
                        const b2 = objs[rope.b2]
                        const d = dist(b1.p, b2.p)
                        const diff = rope.l - d
                        const dir = norm(subVec(b2.p, b1.p))
                        
                        // Add velocity damping
                        const relativeVel = subVec(b2.v || {x:0,y:0}, b1.v || {x:0,y:0})
                        const dampingForce = multVecCon(dir, dot(relativeVel, dir) * 0.1)
                        
                        const springForce = multVecCon(dir, diff * 0.0001)
                        const totalForce = springForce//subVec(springForce, dampingForce)
                        
                        b1.pp = addVec(b1.pp, totalForce)
                        b2.pp = subVec(b2.pp, totalForce)
                    })
                    // handle bars constraints (inelastic/limited-bounce)
                    bars.forEach(rope=>{
                        const b1 = objs[rope.b1]
                        const b2 = objs[rope.b2]
                        const delta = subVec(b2.p, b1.p)
                        const d = Math.max(1e-6, Math.hypot(delta.x, delta.y))
                        const diff = d - rope.l
                        if (Math.abs(diff) < 1e-6) return
                        const dir = { x: delta.x / d, y: delta.y / d }

                        const m1 = (b1.m !== undefined) ? b1.m : 1
                        const m2 = (b2.m !== undefined) ? b2.m : 1
                        const invSum = 1 / (m1 + m2)

                        const correction = multVecCon(dir, diff)
                        const corr1 = multVecCon(correction, - (m2 * invSum))
                        const corr2 = multVecCon(correction,   (m1 * invSum))
                        const maxCorrection = 4
                        const clamp = v => {
                            const L = Math.hypot(v.x, v.y)
                            if (L > maxCorrection) {
                                const s = maxCorrection / L
                                return { x: v.x * s, y: v.y * s }
                            }
                            return v
                        }
                        const c1 = clamp(corr1)
                        const c2 = clamp(corr2)
                        b1.pp = addVec(b1.pp, c1)
                        b2.pp = subVec(b2.pp, c2)

                        // limit bounce along the link to at most gravity-derived speed
                        const v1 = subVec(b1.p, b1.pp)
                        const v2 = subVec(b2.p, b2.pp)
                        const relVel = (v2.x - v1.x) * dir.x + (v2.y - v1.y) * dir.y
                        if (relVel < 0){
                            const maxBounce = Math.abs(grav) * meterPixRatio / targetRate
                            const correctionVel = Math.min(-relVel, maxBounce)
                            const dp1 = multVecCon(dir, correctionVel * (m2 * invSum))
                            const dp2 = multVecCon(dir, -correctionVel * (m1 * invSum))
                            b1.pp = addVec(b1.pp, dp1)
                            b2.pp = addVec(b2.pp, dp2)
                        }
                    })
                }
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
                    ctx.moveTo(c1p.x + emv.x, c1p.y + emv.y)
                    ctx.lineTo(snapped.x + emv.x, snapped.y + emv.y)
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
    bombs.forEach(bomb=>{
        ctx.fillStyle="red"
        ctx.drawImage(bomsrc, bomb.x-16+emv.x, bomb.y-16+emv.y, 32, 32)
    })
    //
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    //
}
let loop = setInterval(run, 1000/targetRate)
abbtn.addEventListener("click", ()=>{
    addObj(parseFloat(xinp.value)*meterPixRatio, parseFloat(yinp.value)*meterPixRatio,
    parseFloat(rinp.value)*meterPixRatio,parseFloat(binp.value),
    HEXRGB(cinp.value),parseFloat(vxinp.value)*meterPixRatio,
    parseFloat(vyinp.value)*meterPixRatio, parseFloat(winp.value))
})
window.addEventListener("keypress", (e) => {
    if (document.activeElement.id!=="consoletxt"){
        
        switch (e.key){
            case "c"||"Escape":
                selecting = false
                av = false 
                af = false 
                ml = false
                abomb = false
                arope.ia = false
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
                break
            case "t":
                adding.ia=true
                adding.t=1
                break
            case "r":
                arope.ia = true
                arope.t=1
                
        }
    }
})
getEl('text').addEventListener('change', function() {
    const text = getEl('text').value
    const title = document.getElementById("title").value
    const file = encode()
    const filename = document.getElementById("filename").value
    const user = document.getElementById('username').value
    getEl("fileh").value=file
    document.getElementById('post-preview').innerHTML = 
    `
    <h3>${title}</h3>
    <p>By ${user}</p><br>
    <p>${textToHTML(text)}</p>
    ${
        file.length ? `<br><a download="${filename}.psave" href="data:text/base64,+${file}">Download ${filename}</a>`: ``
    }`
});
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
    document.activeElement = canvas
})
canvas.addEventListener("mouseup", ()=>{
    clicking = false
})
window.addEventListener("keydown", (e)=>{
    if (inf){
        switch(e.key){
            case 'ArrowLeft':
                emv.x+=5
                break
            case 'ArrowRight':
                emv.x-=5
                break
            case 'ArrowUp':
                emv.y+=5
                break
            case 'ArrowDown':
                emv.y-=5
        }
    }
})
let pmx;
let pmy;
canvas.addEventListener("mousemove", (e)=>{
    mx = Math.round((e.clientX-offX)*ma) - emv.x
    my = Math.round(e.clientY*ma) - emv.y
    if (clicking){
        if (!drawing)
        {
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
        else
        {
            c1p = {x:pmx,y:pmy}
            c2p = {x:mx,y:my}
            addLine(parseInt(lwinp.value))
        }
    }
    pmy = my
    pmx = mx
})
window.onclick = (e)=>{
    //
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    // GYATTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
    //
        if (disec){
            switch(cn){
                case 0:
                    d1p = {x:mx,y:my}
                    cn=1
                    break
                case 1:
                    d2p = {x:mx,y:my}
                    cn=2
                    break
                case 2:
                    let i = 0
                    lines.forEach(l=>{
                        if (pointInBox(d1p.x,d1p.y,d2p.x,d2p.y,l.p1) && pointInBox(d1p.x,d1p.y,d2p.x,d2p.y,l.p2)){
                            lines.splice(i,1)
                            
                        } else{
                            i++
                        }
                    })
                    cn=0
                    disec=false
                    return
            }
            return
        }
    
    if (e.clientX>offX&&e.clientX<innerWidth-offX && e.clientY>0&&e.clientY<innerHeight-50){

        if (!selecting && !ml && !av && !af && !deleting && !adding.ia&& !abomb && !arope.ia){
            try{
            addObj(mx,my,
            parseFloat(rinp.value)*meterPixRatio,parseFloat(binp.value),
            HEXRGB(cinp.value),parseFloat(vxinp.value)*meterPixRatio,
            parseFloat(vyinp.value)*meterPixRatio, parseFloat(winp.value))
            }catch(e){alert(e)}
            return
        }
        if (selecting && !ml && !av && !af && !deleting && !adding.ia&& !abomb && !arope.ia){
            const s = select(mx, my)
            if (s!==false){
                if (sil===false){
                    objs[s].s = true
                }
                selected=s
                hidden.style.display = "block"

    canvas.style.cursor="crosshair"
            }  
            return
        }
        if (ml && !selecting && !av && !af && !deleting && !adding.ia&& !abomb && !arope.ia){
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
            return
        }
        if (av && !selecting && !af && !ml && !deleting && !adding.ia&& !abomb && !arope.ia){
            valves.push({p:{x:mx, y:my},r:parseFloat(rinp.value)*meterPixRatio,c:HEXRGB(cinp.value),o:false})
            vninp.max = valves.length-1
            av=false
            return
        }
        if (af && !selecting && !av && !ml && !deleting && !adding.ia&& !abomb && !arope.ia){
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
            return
        }
        if (deleting && !selecting && !av && !ml && !af && !adding.ia&& !abomb && !arope.ia){
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
            return
        }
        if (!deleting && !selecting && !av && !ml && !af && adding.ia&& !abomb && !arope.ia){
            switch(adding.t){
                case 1:
                    tcans.push({x:mx, y:my})
                    break
                case 2:
                    lines[lninp.value].m = {p:snapLines(mx,my),h:true,t:0,s:msinp.value*0.0174533/targetRate}
                    break
            }
            adding.ia=false
            return
        }
    }   
    if (!deleting && !selecting && !av && !ml && !af && !adding.ia && abomb && e.clientY < innerHeight-50 && !arope.ia){
        bombs.push({x:mx,y:my})
        const bi = bombs.length-1
        const bom = bombs[bi]
        abomb=false
        
        setTimeout(()=>{
            objs.forEach(obj=>{

                const d = dist(bom, obj.p)
                if (d <= 50){
                    const force = 500000/d/obj.w
                    const nforce = multVecCon(norm(subVec(obj.p, bom)),force)
                    obj.pp.x -= nforce.x
                    obj.pp.y -= nforce.y
                }
            })
                bombs.splice(bi, 1)
        }, 5000)
    }
    if (!deleting && !selecting && !av && !ml && !af && !adding.ia&& !abomb && arope.ia){
        switch(cn){
            case 0:
                s1b = selectBall(mx, my)
                if (s1b!==undefined){
                    cn++
                }
                break
            case 1:
                s2b = selectBall(mx, my)
                if (s2b!==undefined && s2b!==s1b){
                    if (arope.t==1){
                    addRope(s1b, s2b)
                    }
                    if (arope.t==2){
                        addSpring(s1b, s2b)
                    }
                    arope.ia=false
                    cn=0
                }
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
abmbtn.addEventListener("click", ()=>{
    abomb=true
})
clearbtn.addEventListener("click", ()=>{
    objs=[]
    lines=[]
    valves=[]
    fans=[]
    tcans=[]
    ropes = []
    springs=[]
    bars=[]
    ltype=0
    cn=0
    ml =false
    deleting=false
    adding.ia=false
    drawing=false
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
    ropes=[]
    springs=[]
    bars=[]
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
    savelnk.href="data:application/octet-stream;base64,"+encode()
    
    savelnk.download = getEl("savename").value+".psave"
    savelnk.click()
})
ppbtn.addEventListener("click", ()=>{
    paused = paused ? false : true
    ppbtn.style.backgroundColor = paused ? "red" : "green"
    clearInterval(loop)
    loop = setInterval(run, 1000/targetRate)
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

dsbtn.onclick=()=>{
    sm = 2
}
tsbtn.onclick=()=>{
    sm = 3
}
saveslotinp.addEventListener("change", async ()=>{
    await setCloudData()
    lines=[]
    valves=[]
    fans=[]
    tcans=[]
    balls=[]
    localStorage.setItem("saveslot", saveslotinp.value)
    saveslot = parseInt(saveslotinp.value)
    saveData(saveslot, 'saveslot')
    loadSave(saveslot)
    console.log(lines)
})
bldok.addEventListener("click", ()=>{
    const color = HEXRGB(btypeinp.value)
    let dqueue = []
    objs.forEach(ball => {
        if (compareArr(color, ball.c)){

            dqueue.push(ball.n)
        }
    })
    for (let n = dqueue.length-1; n >= 0; n--){
        objs.splice(dqueue[n], 1)
        for (let i = 0; i < objs.length; i++){
            if (i>=dqueue[n]){
                objs[i].n--
            }
        }
    }
})
arbtn.addEventListener("click", ()=>{
    arope.ia=true
    arope.t=1
})