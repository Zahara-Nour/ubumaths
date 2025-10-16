/*
 * Created by yvesb on 10/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import $ from 'jquery'

import { ceIn, addImg, ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeurAngle from '../objets/CValeurAngle'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
import ChoixAngleUsuelDlg from 'src/dialogs/ChoixAngleUsuelDlg'

export default AngleArcDlg

/**
 * Dialogue de choix d'angle d'un arc de cercle
 * @param {MtgApp} app La mtgApp propriétaire
 * @param arc L'arc dont l'angle doit être changé
 * @param {boolean} modification true si l'angle de la rotation est un angle déjà existant à modifier
 * @param {VoidCallback} callBackOK null ou fonction de callBack à appeler après OK
 * @param {VoidCallback} callBackCancel null ou fonction de callBack à appeler après annulation
 * @constructor
 * @extends MtgDlg
 */
function AngleArcDlg (app, arc, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'angleArcDlg', callBackOK, callBackCancel)
  const self = this
  this.arc = arc
  this.modification = modification
  const list = app.listePr
  // Un CValeurAngle pour stocker la valeur choisie avant vérification
  this.valeur = new CValeurAngle(list, 1)
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Angle') + ' : ')
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
  td = ceIn(tr, 'td')
  td.style.padding = '1px'
  addImg(td, 'dropdown')
  td.onclick = function () {
    new ChoixAngleUsuelDlg(app, input, list.uniteAngle)
  }
  const indmax = modification ? list.indexOf(this.arc) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  //
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, arc.angleAuCentre.calcul))
  }
  this.create('AngArc', 400)
}

AngleArcDlg.prototype = new MtgDlg()

AngleArcDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const valid = this.editor.validate($('#mtginput').val())
  if (valid) {
    this.arc.angleAuCentre = this.valeur
    if (this.callBackOK !== null) this.callBackOK()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
  }
}

AngleArcDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}
