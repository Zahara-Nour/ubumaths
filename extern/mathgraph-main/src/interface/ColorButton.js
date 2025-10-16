/*
 * Created by yvesb on 22/02/2017.
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
export default ColorButton

/**
 * Classe représentant un bouton de choix de couleur dans une boîte de dialogue
 * this.container contient le gElement représentant le bouton
 * @param dlg Le dialogue contenant le bouton
 * @param color La couleur du bouton à l'initialisation
 * @param callBack Fonction de callBack à appeler quand l'utilisteur change de couleur (null si absent)
 * @constructor
 */
function ColorButton (dlg, color, callBack = null) {
  this.dlg = dlg
  this.color = color
  this.callBack = callBack
  const self = this
  // Le gElement contenu dans this.container qui contiendra une ellipse de choix de couleur
  this.container = cens('g')
  const cx = constantes.lineStyleWidth / 2
  const cy = constantes.lineStyleWidth / 4
  const rx = cx - 2
  const ry = cy - 2
  const col = color.rgb()
  this.btn = cens('ellipse', {
    cx,
    cy,
    rx,
    ry,
    stroke: 'black',
    fill: col
  })
  this.container.appendChild(this.btn)
  this.btn.addEventListener('mousedown', function () {
    if (document.getElementById('colorPicker') !== null) return // Déjà affiché
    const div = ce('div', {
      // class : "cp-default",
      id: 'colorPickerDiv',
      style: 'left:10px;top:30px;witdh=180px;height:180px;position:absolute;margin:0px'
    })
    // app.colorPickerDiv = div;
    // C'est le div qui contient la boîte de dialogue qui contient le color picker pour qu'il soit visible
    dlg.div.appendChild(div)
    const input = ce('input', {
      type: 'text',
      id: 'colorPicker'
    })
    div.appendChild(input)
    $('#colorPicker').spectrum({
      color: self.color.rgb(),
      cancelText: getStr('Cancel'),
      chooseText: getStr('OK'),
      flat: true,
      showInput: true,
      showPalette: true,
      preferredFormat: 'hex',
      palette: constantes.colorPalette,
      clickoutFiresChange: false,
      change: function (color) {
        self.color = new Color(Math.round(color._r), Math.round(color._g), Math.round(color._b))
        $('#colorPicker').spectrum('destroy').remove()
        // $("#colorPicker").remove();
        $('#colorPickerDiv').remove()
        // dlg.div.removeChild(self.div);
        self.btn.setAttribute('fill', color.toHexString())
        if (self.callBack !== null) self.callBack()
      }
    })
  })
}
