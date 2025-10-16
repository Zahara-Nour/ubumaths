/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import constantes from '../kernel/constantes'
import Color from '../types/Color'
import $ from 'jquery'
import '../../outilsExternes/spectrum/spectrum'
import '../../outilsExternes/spectrum/spectrum.css'

export default CouleurFondDlg

/**
 * Dialogue de choix de la couleur de fond de la figure
 * @param {MtgApp} app L'application propriétaire
 * @param callBackOK Fonction de callBack à appeler une fois la couleur choisie
 * @constructor
 */
function CouleurFondDlg (app, callBackOK) {
  MtgDlg.call(this, app, 'CoulFondDlg', callBackOK)
  const self = this
  const doc = app.doc
  const div = ce('div')
  this.appendChild(div)
  this.input = ce('input', {
    type: 'text',
    id: 'colorPicker'
  })
  div.appendChild(this.input)
  $('#colorPicker').spectrum({
    color: doc.couleurFond.rgb(),
    cancelText: getStr('Cancel'),
    chooseText: getStr('OK'),
    flat: true,
    showInput: true,
    showButtons: false,
    showPalette: true,
    preferredFormat: 'hex',
    palette: constantes.colorPalette,
    clickoutFiresChange: false,
    change: function (color) {
      self.color = new Color(Math.round(color._r), Math.round(color._g), Math.round(color._b))
    }
  })
  $('#sp-cancel').css('visibility', 'hidden')
  this.create('CouFond', 500)
}

CouleurFondDlg.prototype = new MtgDlg()

CouleurFondDlg.prototype.OK = function () {
  const doc = this.app.doc
  const color = $('#colorPicker').spectrum('get')
  const coul = new Color(Math.round(color._r), Math.round(color._g), Math.round(color._b))
  doc.couleurFond = coul
  $('#coulFond').attr('fill', coul.rgb())
  this.destroy()
  this.callBackOK()
}
