
//ykw?
const $ = document.getElementById.bind(document)
let engine, ggeo, gcube, selectedObject,balls,cubes
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function componentToHex2(c) {
  var hex = Math.round(c*255).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function rgbToHex2(r, g, b) {
  return "#" + componentToHex2(r) + componentToHex2(g) + componentToHex2(b);
}
const tbtns = document.querySelectorAll('#toolmenuright .tool')
tbtns.forEach(btn => {
  btn.addEventListener('click', function() {
    tbtns.forEach(btn => btn.classList.remove('active'))
    this.classList.add('active')
  })
})

tbtns[0].classList.add('active')