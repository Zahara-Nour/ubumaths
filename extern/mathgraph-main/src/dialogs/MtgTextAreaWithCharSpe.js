/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { preventDefault } from '../kernel/kernel'
import CarSpeciauxDlg from '../dialogs/CarSpeciauxDlg'
import $ from 'jquery'
import 'jquery-textrange'

export default MtgTextAreaWithCharSpe

/**
 *
 * @param {MtgApp} app
 * @param arg
 * @param types
 * @param bLatex
 * @param dlg
 * @returns {Element}
 * @constructor
 */
function MtgTextAreaWithCharSpe (app, arg, types, bLatex, dlg) {
  this.app = app
  this.dlg = dlg
  const self = this
  const argt = arguments.length === 1 ? {} : arguments[1]
  this.dlgCharSpe = null // Utilisé par les MtgInputWithCharSpe et CarSpeciauxDlg
  const inp = ce('textarea', argt)
  inp.setAttribute('spellcheck', 'false')
  inp.onfocus = function () {
    if (self.dlg.dlgCharSpe === null) {
      self.dlg.dlgCharSpe = new CarSpeciauxDlg(app, this, types, bLatex, dlg, false)
      setTimeout(function () { // Ne marche pas sans un setTimeOut
        inp.focus() // Pour que le focus soit donné à l'éditeur au départ ou quand un  message d'erreur est affiché
      }, 0)
    }
  }
  // Si on appuie sur la touche tab on met le curseur dans la prochaine accolade ouvrante
  inp.onkeydown = function (ev) {
    if (ev.keyCode === 9) { // Touche Tab
      const select = $(this)
      const cp = select.textrange('get', 'start')
      const ch = select.val()
      const len = ch.length
      let i
      for (i = cp; (i < len) && (ch.charAt(i) !== '{'); i++);
      if (i < len) select.textrange('setcursor', i + 1)
      else {
        const ind = ch.indexOf('}', cp)
        if (ind !== -1) select.textrange('setcursor', ind + 1)
      }
      preventDefault(ev)
    }
  }
  return inp
}
