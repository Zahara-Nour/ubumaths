/*
 * Created by yvesb on 18/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
import Dimf from '../types/Dimf'
export default SaveDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function SaveDlg (app) {
  MtgDlg.call(this, app, 'SaveDlg')
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const label = ce('label')
  $(label).html(getStr('saveDlg1'))
  div.appendChild(label)
  this.input = getMtgInput({
    id: 'mtginput'
  })
  div.appendChild(this.input)
  // app.fileName peut avoir été initialisé dans via OutilOpen
  if (app.fileName) $(this.input).val(app.fileName + '-1')
  this.input.onkeyup = function (ev) {
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.create('Save', 550)
}

SaveDlg.prototype = new MtgDlg()

SaveDlg.prototype.OK = function () {
  const ch = $('#mtginput').val()
  // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
  const app = this.app
  if ((ch === '') || !ch.match(/[\w \-_()]+/)) {
    this.input.marquePourErreur()
    new AvertDlg(app, 'NomFichierErr', function () {
      $('#mtginput').focus()
    })
    return
  }
  const doc = app.doc
  // Si un cadre a été choisi dans la figure et si la case à cocher est cochée, on enregistre la figure
  // avec les dimensions du cadre
  const olddimf = doc.dimf
  if (app.cadre !== null) doc.dimf = new Dimf(app.widthCadre, app.heightCadre)
  doc.saveAs(ch)
  this.destroy()
  doc.dimf = olddimf
}

SaveDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}
