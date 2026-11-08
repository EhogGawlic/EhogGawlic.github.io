class Popup {
  constructor(element, manager) {
    this.element = element
    this.header = element.querySelector(".popupHead")
    this.manager = manager
    this.drag = null

    element.addEventListener("pointerdown", () => manager.bringToFront(this))

    this.header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return
      if (event.target.closest("button")) return

      const rect = this.element.getBoundingClientRect()
      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top
      }

      event.preventDefault()
      this.header.setPointerCapture(event.pointerId)
      this.element.style.transform = "none"
      this.element.style.left = `${rect.left}px`
      this.element.style.top = `${rect.top}px`
      this.positioned = true
    })

    this.header.addEventListener("pointermove", (event) => {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return

      this.element.style.left =
        `${this.drag.left + event.clientX - this.drag.startX}px`
      this.element.style.top =
        `${this.drag.top + event.clientY - this.drag.startY}px`
    })

    this.header.addEventListener("pointerup", () => {
      this.drag = null
    })

    this.header.addEventListener("pointercancel", () => {
      this.drag = null
    })

    element.querySelector(".popupClose")?.addEventListener("click", (event) => {
      event.stopPropagation()
      manager.close(this)
    })
  }

  open() {
    this.element.style.display = "block"
    if (!this.positioned) {
      this.element.style.left = "50%"
      this.element.style.top = "50%"
      this.element.style.transform = "translate(-50%, -50%)"
    }
    this.manager.bringToFront(this)
  }

  close() {
    this.element.style.display = "none"
  }
}

class PopupManager {
  constructor(elements) {
    this.popups = new Map()
    this.openPopups = []
    this.nextZIndex = 1001

    for (const element of elements) {
      this.popups.set(element.id, new Popup(element, this))
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-popup-target]")
      if (trigger) this.open(trigger.dataset.popupTarget)
    })

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.closeTopmost()
    })
  }

  open(id) {
    this.popups.get(id)?.open()
  }

  close(popup) {
    const target = typeof popup === "string" ? this.popups.get(popup) : popup
    if (!target) return

    target.close()
    this.openPopups = this.openPopups.filter((openPopup) => openPopup !== target)
  }

  closeTopmost() {
    this.close(this.openPopups.at(-1))
  }

  bringToFront(popup) {
    this.openPopups = this.openPopups.filter((openPopup) => openPopup !== popup)
    this.openPopups.push(popup)
    popup.element.style.zIndex = this.nextZIndex++
  }
}

const popupManager = new PopupManager(document.querySelectorAll(".popup"))
window.openPopup = (id = "popup") => popupManager.open(id)
window.closePopup = (id) => id ? popupManager.close(id) : popupManager.closeTopmost()