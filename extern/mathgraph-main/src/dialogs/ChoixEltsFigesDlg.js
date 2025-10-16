/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'

export default ChoixEltsFigesDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function ChoixEltsFigesDlg (app) {
  MtgDlg.call(this, app, 'ChoixEltsFigesDlg')
  const doc = app.doc
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let div = ce('div')
  tr.appendChild(div)
  let input = ce('input', {
    id: 'cb1',
    type: 'checkbox'
  })
  div.appendChild(input)
  if (doc.affichagesFiges) $(input).attr('checked', 'checked')
  let label = ce('label', {
    for: 'cb1'
  })
  div.appendChild(label)
  $(label).html(getStr('affFiges'))

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  input = ce('input', {
    id: 'cb2',
    type: 'checkbox'
  })
  div.appendChild(input)
  if (doc.marquesAnglesFigees) $(input).attr('checked', 'checked')
  label = ce('label', {
    for: 'cb2'
  })
  $(label).html(getStr('marAngFigees'))
  div.appendChild(label)

  // Création de la boîte de dialogue par jqueryui
  this.create('EltsFiges', 500)
}

ChoixEltsFigesDlg.prototype = new MtgDlg()

ChoixEltsFigesDlg.prototype.OK = function () {
  const doc = this.app.doc
  doc.affichagesFiges = $('#cb1').prop('checked')
  doc.marquesAnglesFigees = $('#cb2').prop('checked')
  this.destroy()
}
