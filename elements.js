/**
 * Returns an element by its ID.
 * 
 * @param {String} id 
 * @returns {HTMLElement}
 */
function getEl(id){
    return document.getElementById(id)
}
/**
 * 
 * @param {String} id 
 * @returns {HTMLCanvasElement}
 */
function canv(id){
    return getEl(id)
}
const canvas = canv("canvas")
canvas.width=innerHeight
canvas.height=innerHeight
const multamount = (innerHeight-54)/innerHeight
const ma = 1/multamount
const offX=(innerWidth-innerHeight)/2+(innerHeight-innerHeight*multamount)/2

canvas.style.left=offX+"px"
canvas.style.width=innerHeight-54+"px"
canvas.style.height=innerHeight-54+"px"
const ctx = canvas.getContext("2d"),
      xinp = getEl("xinp"),
      yinp = getEl("yinp"),
      winp = getEl("winp"),
      cinp = getEl("cinp"),
      binp = getEl("binp"),
      vxinp = getEl("vxinp"),
      vyinp = getEl("vyinp"),
      abbtn = getEl("addballbtn"),
      rinp = getEl("rinp"),
      dinp = getEl("dinp"),
      presets = getEl("presets"),
      fpsEl = getEl("FPS"),
      autoc = getEl("autoc"),
      substeps = getEl("substeps"),
      selectbtn = getEl("selectbtn"),
      hidden = getEl("hidden"),
      rbbtn = getEl("remove"),
      clearbtn = getEl("clearbtn"),
      swi = getEl("swi"),
      acs = getEl("acs"),
      fixed = getEl("fixed"),
      albtn = getEl("albtn"),
      lwinp = getEl("lwinp"),
      clearufbtn= getEl("clearufbtn"),
      savelnk = getEl("savelnk"),
      savebtn = getEl("savebtn"),
      savebtnc = getEl("savebntc"),
      saveinp = getEl("saveinp"),
      ppbtn = getEl("ppbtn"),
      rstbtn = getEl("rstbtn"),
      lmenu = getEl("leftmenu"),
      rmenu = getEl("rightmenu"),
      avbtn = getEl("avbtn"),
      vninp = getEl("vninp"),
      ocvbtn = getEl("ocvbtn"),
      afbtn = getEl("afbtn"),
      fsinp = getEl("fsinp"),
      stinp = getEl("stinp"),
      scinp = getEl("scinp"),
      asinp = getEl("addselect"),
      dbtn = getEl("dbtn"),
      stbtn = getEl("settingsbtn"),
      grinp = getEl("gravinp"),
      settings = getEl("settings"),
      tcansrc = getEl("tcansrc"),
      ceinp = getEl("ceinp"),
      lninp = getEl("lni"),
      okbtn = getEl("okbtn1"),
      msinp = getEl("msinp"),
      sps = getEl("sps"),
      acb = getEl("acb"),
      bcb = getEl("bcb"),
      cresinp = getEl("cres"),
      dsbtn = getEl("2sbtn"),
      tsbtn = getEl("3sbtn")
lmenu.style.width = offX+"px"
rmenu.style.width = offX+"px"
ctx.lineCap = "round"
switch(getCookie("btype")){
    case "\"sm\"":
        dinp.value=78.3
        cinp.value="#808080"
        binp.value=0.2
        liq = false
        stinp.value=0
        rinp.value=5
        break
    case "\"pla\"":
        dinp.value=12.5
        cinp.value="#F0F0F0"
        binp.value=0.8
        liq = false
        stinp.value=0
        rinp.value=5
        break
    case "\"fb\"":
        dinp.value=12.5
        cinp.value="#0080FF"
        binp.value=1
        liq = false
        stinp.value=0
        rinp.value=5
        break
    case "\"nb\"":
        dinp.value=12.5
        cinp.value="#FF6961"
        binp.value=0
        liq = false
        stinp.value=0
        rinp.value=5
        break
    case "\"w\"":
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
    case "\"m\"":
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
    case "\"sf\"":
        dinp.value=0.35
        cinp.value="#F9F9F9"
        binp.value=0.1
        liq = false
        rinp.value=5
        stinp.value=0
}
const fan1 = imgSrc("fan1.png")
const fan2 = imgSrc("fan2.png")
const savestr = getStorage("save")
if (!localStorage.getItem("saveid").charAt(0)==="0"){
    localStorage.setItem("saveid", Math.random().toString())
} else {
    /*(async function(){
        const res = await fetch("https://mn4zqn4t-3000.usw3.devtunnels.ms/filedata:id="+localStorage.getItem("saveid"))
        if (!res.ok){
            throw new Error(res.status)
        }
        const data = await res.blob()
        console.log(data)
        const buffer = await res.arrayBuffer()
        console.log(buffer)
        testDecode(buffer)
    }())*/
}