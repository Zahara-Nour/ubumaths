/*
 * Created by yvesb on 05/05/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
export default PointParMultVecDlg

/**
 *
 * @param {MtgApp} app
 * @param pt
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function PointParMultVecDlg (app, pt, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ptParMultVecDlg', callBackOK, callBackCancel)
  this.pt = pt
  const self = this
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeurCoef = new CValeur(list, 1)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('PtParMultVecDlg2') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(pt) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tabPrincipal.appendChild(paneBoutonsValFonc)
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeurCoef, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, pt.coef.calcul))
  }
  this.create('PtParMultVec', 450)
}

PointParMultVecDlg.prototype = new MtgDlg()

PointParMultVecDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

PointParMultVecDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const sel = $('#mtginput')
  if (this.editor.validate(sel.val())) {
    this.pt.coef = this.valeurCoef
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  } else sel.focus()
}
