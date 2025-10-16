/*
 * Created by yvesb on 25/03/2017.
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

export default PtParAbsDlg

/**
 * Dialogue de choix d'abscisse d'un point relativement à deux autres
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param pt L'arc dont l'angle doit être changé
 * @param modification boolean : true si on modifie l'abscisse d'un point déjà créé
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annulation
 */
function PtParAbsDlg (app, pt, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'angleArcDlg', callBackOK, callBackCancel)
  const self = this
  this.pt = pt
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeur = new CValeur(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Abscisse') + ' : ')
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
  const indmax = modification ? list.indexOf(this.pt) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  //
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, pt.abscisse.calcul))
  }
  this.create('PtParAbs', 400)
}

PtParAbsDlg.prototype = new MtgDlg()

PtParAbsDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const valid = this.editor.validate($('#mtginput').val())
  if (valid) {
    this.pt.abscisse = this.valeur
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  }
}

PtParAbsDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}
