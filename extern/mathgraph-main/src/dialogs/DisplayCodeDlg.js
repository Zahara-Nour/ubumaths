/*
 * Created by yvesb on 16/04/2017.
 */
import { ce, copyToClipBoard } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
import toast from '../interface/toast'
export default DisplayCodeDlg

/**
 *
 * @param {MtgApp} app
 * @param code
 * @param title
 * @constructor
 */
function DisplayCodeDlg (app, code, title) {
  MtgDlg.call(this, app, 'CodeDlg')
  const self = this
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)

  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const textarea = ce('textarea', {
    id: 'ta',
    cols: 80,
    rows: 20
  })
  tr.appendChild(textarea)
  const sel = $(textarea)
  sel.css('font-size', '13px')
  sel.val(code)
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}
  if (navigator?.clipboard) {
    // à priori le navigateur gère le presse-papiers, on ajoute les boutons
    buttons[getStr('CopyCode')] = function () {
      copyToClipBoard(code)
        .then(result => {
          if (result) toast({ title: 'CopyCodeOk' })
          else new AvertDlg(self.app, 'CopyCodeKo')
        })
    }
  }
  buttons[getStr('Fermer')] = function (ev) {
    self.onClose(ev)
  }

  // Cette boîte de dialogue n'a qu'un bouton : On n'appelle pas create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr(title),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.onClose(ev)
    },
    width: 650,
    closeOnEscape: false,
    // On affiche la boîte de dialogue sur le div parent de l'application en haut et à droite
    position: { my: 'right top', at: 'right top', of: this.app.svg.parentElement }
  })
}

DisplayCodeDlg.prototype = new MtgDlg()
