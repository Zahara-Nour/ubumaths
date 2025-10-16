/*
 * Created by yvesb on 13/10/2016.
 */
import { ce, cens } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import { getStr } from '../kernel/kernel'
import constantes from '../kernel/constantes'

import $ from 'jquery'
import '../../outilsExternes/spectrum/spectrum'
import '../../outilsExternes/spectrum/spectrum.css'
export default ColorChoicePanel

/**
 *
 * @param {MtgApp} app
 * @param {number} y ordonnée réelle du coin supérieur gauche du bouton relativement à la barre d'outils de droite
 * @constructor
 */
function ColorChoicePanel (app, y) {
  const zf = app.zoomFactor
  const self = this
  this.app = app
  this.y = y // Pour le tip
  this.tip = ''
  this.target = 'right'
  // this.tip = getStr('CouleurPerso')
  const g = cens('g', {
    transform: 'translate(0,' + y + ')'
  })
  this.container = g
  const col = app.getCouleur().rgb()
  const rect = cens('rect', {
    x: 0,
    y: 0,
    width: constantes.rightPanelWidth * zf,
    height: constantes.colorChoicePanelHeight * zf,
    stroke: 'none',
    fill: constantes.buttonBackGroundColor
  })
  g.appendChild(rect)
  const cx = constantes.rightPanelWidth / 4 * zf
  const cy = constantes.colorChoicePanelHeight / 2 * zf
  const rx = cx - 2
  const ry = cy - 2
  this.btnLeft = cens('ellipse', {
    cx,
    cy,
    rx,
    ry,
    color: 'black',
    fill: col
  })
  g.appendChild(this.btnLeft)
  this.btnLeft.y = y
  this.btnLeft.addEventListener('mouseover', function () {
    if (self.tip !== getStr('CouleurPerso')) {
      self.app.cacheTip() // Sans argument pour effacer l'ancien tip quel qu'il soit
      self.tip = getStr('CouleurPerso')
      self.tipDisplayed = false
      self.app.setTip(self)
      setTimeout(function () {
        self.app.cacheTip(self)
        self.tip = ''
      }, 2500)
    }
  })
  this.btnRight = cens('ellipse', {
    cx: 3 * cx,
    cy,
    rx,
    ry,
    color: 'black',
    fill: col,
    opacity: app.opacity
  })
  this.btnRight.y = y
  this.btnRight.addEventListener('mouseover', function () {
    const app = self.app
    if (!self.tip.startsWith(getStr('CouleurRendu'))) {
      self.tip = getStr('CouleurRendu') + ' ' + app.opacitySlider.val + ' %'
      app.cacheTip() // Sans argument pour effacer l'ancien tip quel qu'il soit
      app.setTip(self)
      setTimeout(function () {
        self.app.cacheTip(self)
        self.tip = ''
      }, 2500)
    }
  })

  g.appendChild(this.btnRight)
  this.btnLeft.addEventListener('mousedown', function () {
    if (document.getElementById('colorPicker') !== null) return // Déjà affiché
    const app = self.app
    const x = app.svgFigure.dimWork.x - constantes.rightPanelWidth * app.zoomFactor - 220
    const y = self.y + constantes.toolbarHeight - 200
    const div = ce('div', {
      // class : "cp-default",
      id: 'colorPickerDiv',
      style: 'left:' + x + 'px;top:' + y + 'px;witdh=200px;height:230px;position:absolute;margin:0px'
    })
    app.colorPickerDiv = div
    const parentDiv = app.svg.parentElement // Pointe sur le div parent de l'appli
    parentDiv.appendChild(div)
    const input = ce('input', {
      type: 'text',
      id: 'colorPicker'
    })
    div.appendChild(input)
    $('#colorPicker').spectrum({
      color: self.app.getCouleur().rgb(),
      cancelText: getStr('Cancel'),
      chooseText: getStr('OK'),
      flat: true,
      showInput: true,
      showPalette: true,
      preferredFormat: 'hex',
      palette: constantes.colorPalette,
      clickoutFiresChange: false,
      change: function (color) {
        const app = self.app
        app.couleurActive = new Color(Math.round(color._r), Math.round(color._g), Math.round(color._b), app.opacity)
        $('#colorPicker').spectrum('destroy').remove()
        // $("#colorPicker").remove();
        $('#colorPickerDiv').remove()
        app.colorChoicePanel.setColor(app.couleurActive)
      }
    })
  })
}
ColorChoicePanel.prototype.setColor = function (col) {
  this.btnLeft.setAttribute('fill', col.rgb())
  this.btnRight.setAttribute('fill', col.rgb())
  this.btnRight.setAttribute('opacity', this.app.opacity) // Modifé version 6.2.0
}

ColorChoicePanel.prototype.update = function () {
  this.setColor(this.app.couleurActive)
}
