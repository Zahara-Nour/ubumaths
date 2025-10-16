/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getMtgInput } from './dom'
import CarSpeciauxDlg from '../dialogs/CarSpeciauxDlg'

export default MtgInputWithCharSpe

/**
 * Editeur descendant de getMtgInput et provoquant, quand il a le focus, l'apparition, à droite de la boîte
 * de dialogue qui le possède, d'une boîte de dialogue modale permettant d'insérer des caractères spéciaux
 * en cliquant sur les boutons correspondants
 * @param {MtgApp} app L'applicartion propriétaire
 * @param arg les arguments de création d'un input
 * @param types Array de chaînes de caractères pris dans "grec", "mathjs" ou "arroxws"
 * @param bLatex true si c'est le code LaTeX correspondant au bouton qui doit être inséré
 * @param {MtgDlg} dlg  Le dialogue contenant le input
 * @param bLatexForbidden true si on ne veut pas donner la possibilité d'insérer du code LaTeX
 * @constructor
 */
function MtgInputWithCharSpe (app, arg, types, bLatex, dlg, bLatexForbidden = false) {
  const argt = arguments.length === 1 ? {} : arguments[1]
  argt.type = 'text'
  // var inp = ce("input", argt);
  const inp = getMtgInput(argt)
  inp.setAttribute('spellcheck', 'false')
  this.app = app
  this.dlg = dlg
  // dlg.dlgCharSpe = null;
  const self = this
  inp.onfocus = function () {
    if (self.dlg.dlgCharSpe === null) {
      self.dlg.dlgCharSpe = new CarSpeciauxDlg(app, this, types, bLatex, dlg, bLatexForbidden)
      setTimeout(function () { // Ne marche pas sans un setTimeOut
        inp.focus() // Pour que le focus soit donné à l'éditeur au départ ou quand un  message d'erreur est affiché
      }, 0)
    }
  }
  inp.onblur = function (ev) {
    const className = ev?.relatedTarget?.className
    if (self.dlg.dlgCharSpe !== null && (ev.currentTarget === this) && (className !== 'charbutton') &&
      (className !== 'charselect') && (className?.indexOf('ui-') !== 0)) {
      self.dlg.dlgCharSpe.destroy()
      self.dlg.dlgCharSpe = null
    }
  }
  return inp
}
