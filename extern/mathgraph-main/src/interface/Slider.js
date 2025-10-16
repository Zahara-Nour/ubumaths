/*
 * Created by yvesb on 08/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import { getStr, preventDefault } from '../kernel/kernel'
import constantes from '../kernel/constantes'
import SliderDlg from '../dialogs/SliderDlg'

export default Slider

function getMousePosition (app, evt) {
  const { left, top } = app.rightPanel.getBoundingClientRect()
  return {
    x: evt.clientX - left,
    y: evt.clientY - top
  }
}

function getTouchPosition (app, evt) {
  const { x, y } = app.rightPanel.getBoundingClientRect()
  return {
    x: evt.targetTouches[0].clientX - x,
    y: evt.targetTouches[0].clientY - y
  }
}

// pour qu'un Slider puisse être passé à app.setTip il doit avoir une propriété y
/**
 *
 * @param {MtgApp} app
 * @param {number} width
 * @param {number} height
 * @param {number} min
 * @param {number} max
 * @param {number} startval
 * @param {number} digits
 * @param {number} step
 * @param {string} tip
 * @param {string} transform
 * @param {string} append
 * @param {number} y
 * @param {Function} onUpdate
 * @constructor
 * @implements TippedElt
 */
function Slider (app, width, height, min, max, startval, digits, step, tip, transform, append, y, onUpdate) {
  this.target = 'right' // Pour les tips
  const zf = app.zoomFactor
  width *= zf
  height *= zf
  /** @type {MtgApp} */
  this.app = app
  /** @type {number} */
  this.width = width
  /** @type {number} */
  this.height = height
  /** @type {number} */
  this.min = min
  /** @type {number} */
  this.max = max
  /**
   * La valeur courante du slider
   * @type {number}
   */
  this.val = startval
  /** @type {Function} */
  this.onUpdate = onUpdate
  /** @type {number} */
  this.step = step
  /**
   * Le textCode du tip
   * @type {string}
   */
  this.textCode = tip
  /**
   * Le tip (dans la langue cible)
   * @type {string}
   */
  this.tip = getStr(tip)
  /**
   * L'éventuelle chaîne à rajouter au bout de l'affichage
   * @type {string}
   */
  this.append = append
  /** @type {number} */
  this.y = y // Pour la ligne d'affichage du tip
  /** @type {boolean} */
  this.captured = false
  /** @type {number} */
  this.clicks = 0
  const gap = constantes.sliderGap * zf
  const g = cens('g', {
    transform
  })
  /** @type {SVGElement} */
  this.container = g
  // Un rectangle à gauche qui contiendra le curseur et réagira à la souris
  const widthc = width - digits * constantes.sliderDigitsFontSize * 0.6 * zf // Largeur du curseur
  // this.widthc = widthc;
  const rectg = cens('rect', {
    x: 0,
    y: 0,
    width: widthc,
    height,
    stroke: 'none',
    fill: constantes.buttonBackGroundColor
  })
  g.appendChild(rectg)
  const rectd = cens('rect', {
    x: widthc,
    y: 0,
    width: width - widthc,
    height,
    fill: constantes.buttonBackGroundColor
  })
  g.appendChild(rectd)
  const yl = (height - constantes.sliderThickness * zf) / 2
  // On crée le trait horizontal
  this.segmentWidth = widthc - 2 * constantes.sliderRadius * zf - 2 * gap
  this.xc = gap + constantes.sliderRadius * zf // Abscisse de début du segment
  const seg = cens('line', {
    stroke: constantes.sliderColor,
    'stroke-linecap': 'round',
    x1: this.xc,
    y1: yl,
    x2: gap + this.segmentWidth,
    y2: yl,
    'pointer-events': 'none'
  })
  g.appendChild(seg)

  // On crée le rond qui sera le curseur
  /** @type {number} */
  this.xCurseur = this.xc + this.abscisse(startval)
  /** @type {SVGElement} */
  this.circ = cens('ellipse', {
    cx: this.xCurseur,
    cy: yl,
    rx: constantes.sliderRadius * zf,
    ry: (constantes.sliderHeight / 2 - 2) * zf,
    stroke: 'black',
    fill: 'url(#sliderGrad)',
    'pointer-events': 'none'
  })
  g.appendChild(this.circ)

  // Il faut toujours préciser passive explicitement (pour que chrome arrête de râler en console)
  const activeOpts = { capture: false, passive: false }
  const upListener = this.onDeviceUp.bind(this)
  rectg.addEventListener('mouseup', upListener, activeOpts)
  rectg.addEventListener('touchend', upListener, activeOpts)
  rectg.addEventListener('mousedown', this.onDeviceDown.bind(this, getMousePosition), activeOpts)
  rectg.addEventListener('touchstart', this.onDeviceDown.bind(this, getTouchPosition), activeOpts)
  rectg.addEventListener('mousemove', this.onDeviceMove.bind(this, getMousePosition), activeOpts)
  rectg.addEventListener('touchmove', this.onDeviceMove.bind(this, getTouchPosition), activeOpts)

  // On crée à droite un affichage de la valeur
  this.txt = cens('text', {
    x: String(width - 2),
    y: height - 4 * zf,
    'font-size': String(constantes.sliderDigitsFontSize * zf) + 'px',
    style: 'stroke:blue;font-size:' + String(constantes.sliderDigitsFontSize * zf) + 'px;' + 'font-family:serif;text-anchor:end;'
  })
  this.txt.appendChild(document.createTextNode(this.val + this.append))
  g.appendChild(this.txt)
}
Slider.prototype.abscisse = function (val) {
  return (val - this.min) / (this.max - this.min) * this.segmentWidth
}

Slider.prototype.onDeviceUp = function (evt) {
  this.captured = false
  preventDefault(evt)
  // evt.stopPropagation(evt);
}

// fonc est imposé par le bind, ev filé par l'EventListener
Slider.prototype.onDeviceDown = function (fonc, ev) {
  this.clicks++
  if (this.clicks >= 2) {
    this.doubleClickAction()
    this.clicks = 0 // Ajout version 6.1.0
  } else {
    const self = this
    setTimeout(function () {
      switch (self.clicks) {
        case 1 :
          self.singleClickAction(fonc, ev)
          self.clicks = 0 // Ajout version 6.1.0
          break
        case 2 :
          self.doubleClickAction()
          self.clicks = 0 // Ajout version 6.1.0
      }
    }, 300)
  }
}

Slider.prototype.singleClickAction = function (fonc, ev) {
  let newval
  const zf = this.app.zoomFactor
  const point = fonc(this.app, ev) // Renvoie les coordonnées de la souris par rapport au svgFigure
  const x = point.x
  if (Math.abs(x - this.xCurseur) <= constantes.sliderRadius * zf) this.captured = true
  else {
    if (x > this.xCurseur) {
      newval = this.val + this.step
      if (newval > this.max) newval = this.max
      this.update(newval)
    } else {
      if (x < this.xCurseur) {
        newval = this.val - this.step
        if (newval < this.min) newval = this.min
        this.update(newval)
      }
    }
  }
  preventDefault(ev)
}

Slider.prototype.doubleClickAction = function () {
  new SliderDlg(this.app, this)
}
/**
 * Listener du move, actif (il faut préciser passive: false au addEventListener)
 * @param {function} fonc la fonction imposée par le .bind()
 * @param {MouseEvent|TouchEvent} ev l'événement transmis par l'EventListener
 */
Slider.prototype.onDeviceMove = function (fonc, ev) {
  if (this.captured) {
    const point = fonc(this.app, ev) // Renvoie les coordonnées de la souris par rapport au svgFigure
    let x = point.x
    const x1 = this.xc + this.segmentWidth
    if (x < this.xc) x = this.xc
    else if (x > x1) x = x1
    const abs = (x - this.xc) / this.segmentWidth
    const newval = Math.round(this.min + abs * (this.max - this.min))
    this.update(newval)
  } else {
    if (!this.tipDisplayed) {
      this.app.cacheTip() // Sans argument pour effacer l'ancien tip quel qu'il soit
      // Cet appel va modifier this.tipDisplayed
      this.app.setTip(this)
      setTimeout(() => this.app.cacheTip(this), 2500)
    }
  }
  preventDefault(ev)
}
Slider.prototype.updatePosition = function () {
  this.xCurseur = this.xc + this.segmentWidth * (this.val - this.min) / (this.max - this.min)
  this.circ.setAttribute('cx', this.xCurseur)
  this.updateDisplay()
}

Slider.prototype.updateDisplay = function () {
  this.txt.removeChild(this.txt.firstChild)
  this.txt.appendChild(document.createTextNode(this.val + this.append))
}

Slider.prototype.update = function (newVal) {
  if ((typeof newVal === 'number') && Number.isInteger(newVal) && (newVal >= this.min) && (newVal <= this.max)) {
    this.val = newVal
    this.onUpdate(newVal) // Pour appeler la fonction affectant cette valeur
    this.updatePosition()
  }
}
