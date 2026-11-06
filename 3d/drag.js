
const popup = document.getElementById("popup")
const header = document.getElementById("popupHead")

function openPopup() {
  popup.style.display = "block"
  popup.style.top = "50%"
  popup.style.left = "50%"
  popup.style.transform = "translate(-50%, -50%)"
}

function closePopup() {
  popup.style.display = "none"
}

let isDragging = false
let startX, startY, initialLeft, initialTop

header.addEventListener("mousedown", (e) => {
  isDragging = true
  const rect = popup.getBoundingClientRect()
  popup.style.transform = "none"
  popup.style.left = rect.left + "px"
  popup.style.top = rect.top + "px"

  startX = e.clientX
  startY = e.clientY
  initialLeft = rect.left
  initialTop = rect.top

  document.addEventListener("mousemove", dragElement)
  document.addEventListener("mouseup", stopDragging)
})

function dragElement(e) {
  if (!isDragging) return
  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY

  popup.style.left = (initialLeft + deltaX) + "px"
  popup.style.top = (initialTop + deltaY) + "px"
}
function stopDragging() {
  isDragging = false;
  document.removeEventListener("mousemove", dragElement)
  document.removeEventListener("mouseup", stopDragging)
}
