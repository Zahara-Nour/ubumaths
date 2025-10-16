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
import EditeurConst from './EditeurConst'
import $ from 'jquery'

export default CodeTikzDlg

/**
 * Dialogue de choix d'angle de rotation
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {function} callBack Fonction de callBack à appler après validation
 */
function CodeTikzDlg (app, callBack) {
  let tr, label, div
  MtgDlg.call(this, app, 'tikzDlg')
  this.callBack = callBack
  const list = app.listePr
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const rad1 = ce('input', {
    type: 'radio',
    id: 'rad1',
    name: 'rad'
  })
  div.appendChild(rad1)
  rad1.onclick = function () {
    $('#div2').css('display', 'none')
    $('#div1').css('display', 'block')
  }
  label = ce('label', {
    for: 'rad1'
  })
  $(label).html(getStr('TikzDlg1'))
  div.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div', {
    id: 'div1'
  })
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('TikzDlg3'))
  div.appendChild(label)
  const input1 = getMtgInput({
    id: 'input1',
    size: 5
  })
  div.appendChild(input1)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const rad2 = ce('input', {
    type: 'radio',
    id: 'rad2',
    name: 'rad'
  })
  div.appendChild(rad2)
  rad2.onclick = function () {
    $('#div1').css('display', 'none')
    $('#div2').css('display', 'block')
  }
  label = ce('label', {
    for: 'rad2'
  })
  $(label).html(getStr('TikzDlg2'))
  div.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div', {
    id: 'div2'
  })
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('TikzDlg4'))
  div.appendChild(label)
  const input2 = getMtgInput({
    id: 'input2',
    size: 4
  })
  div.appendChild(input2)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cb = ce('input', {
    type: 'checkbox',
    id: 'cb'
  })
  div.appendChild(cb)
  label = ce('label', {
    for: 'cb'
  })
  $(label).html(getStr('TikzDlg5'))
  div.appendChild(label)
  if (list.pointeurLongueurUnite === null) {
    $(rad1).attr('disabled', true)
    $('#div1').css('display', 'none')
    $('#rad2').attr('checked', 'checked')
    $(input2).val('12')
  } else {
    $('#rad1').attr('checked', 'checked')
    $(input1).val('1')
    $('#div2').css('display', 'none')
  }

  this.editeur1 = new EditeurConst(app, input1, 0.1, 10, false)
  this.editeur2 = new EditeurConst(app, input2, 1, 40, false)
  // Création de la boîte de dialogue par jqueryui
  this.create('CodeTikz', 550)
}

CodeTikzDlg.prototype = new MtgDlg()

CodeTikzDlg.prototype.OK = function () {
  const app = this.app
  const list = app.listePr
  const bu = {}
  const bcheck1 = $('#rad1').prop('checked')
  if (bcheck1 ? this.editeur1.validate() : this.editeur2.validate()) {
    if (bcheck1) {
      bu.useFigUnity = true
      bu.infoLength = parseFloat($('#input1').val())
    } else {
      bu.useFigUnity = false
      bu.infoLength = parseFloat($('#input2').val())
    }
    // On considère qu'un figure normal a une largeur de 12 cm. Sinon on applique un coefficient
    // pour l'épaisseur des traits
    const widthcm = bu.useFigUnity
      ? (app.dimf.x / list.pointeurLongueurUnite.rendLongueur() * bu.infoLength)
      : bu.infoLength
    let coef = widthcm / 12
    if (coef > 1) coef = 1
    const code = this.app.doc.getTikz(app, coef, bu, $('#cb').prop('checked'))
    this.destroy()
    this.callBack(code)
  }
}
