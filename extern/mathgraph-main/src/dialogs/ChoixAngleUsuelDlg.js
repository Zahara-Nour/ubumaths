/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, uniteAngleDegre } from '../kernel/kernel'
import { listeAngleDeg, listeAngleRad } from '../kernel/kernelAdd'
import MtgDlg from './MtgDlg'
import $ from 'jquery'

export default ChoixAngleUsuelDlg

/**
 *
 * @param {MtgApp} app
 * @param input
 * @param angleUnity
 * @constructor
 */
function ChoixAngleUsuelDlg (app, input, angleUnity) {
  MtgDlg.call(this, app, 'ChoixAngDlg')
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab = angleUnity === uniteAngleDegre ? listeAngleDeg : listeAngleRad
  this.select = ce('select', {
    size: 8,
    style: 'width:120px'
  })
  tr.appendChild(this.select)
  const self = this
  for (let i = 0; i < tab.length; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(tab[i])
    option.onclick = function () {
      $(input).val(tab[self.select.selectedIndex])
      self.destroy()
    }
    this.select.appendChild(option)
  }
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}
  buttons[getStr('Fermer')] = function (ev) {
    $(input).val(tab[self.select.selectedIndex])
    self.onClose(ev)
  }
  // Cette boîte de dialogue n'a qu'un bouton : On n'appelle pas create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('AngUs'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    width: 200,
    closeOnEscape: false,
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

ChoixAngleUsuelDlg.prototype = new MtgDlg()
