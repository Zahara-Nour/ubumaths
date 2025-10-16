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
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'
import EditeurNomCalcul from './EditeurNomCalcul'
export default InfoRepDlg

/**
 * Dialogue Permettant de créer ou modifier un calcul prenant comme valeur l'abscisse à l'origine,
 * l'ordonnée à l'origine, l'unité en x ou l'unité en y d'un repère
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param calc L'objet à modifier du type CAbscisseOrigineRep, COrdonneeOrigineRep, CUnitexRep ou CUniteyRep
 * @param {number} info  Vatt 0 pour une abscisse à l'origine, 1 pour une ordonnée à l'origine,
 * 2 pour une unité en x et 2 pour une unité en y.
 * La seule chose qu'on peut changer dans cette boîte de dialogue si modification est true est le choix du repère
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function InfoRepDlg (app, calc, info, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'valRepDlg', callBackOK, callBackCancel)
  this.calc = calc
  const self = this
  const ar = ['AbsOrRep', 'OrdOrRep', 'UnitexRep', 'UniteyRep', 'AbsMinRep', 'AbsMaxRep', 'OrdMinRep', 'OrdMaxRep']
  this.title = ar[info]
  this.modification = modification
  const list = app.listePr
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  this.inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const indmax = modification ? list.indexOf(calc) - 1 : list.longueur() - 1
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  tr.appendChild(ce('td'))
  td = ce('td')
  tr.appendChild(td)
  this.paneListeRep = new PaneListeReperes(app, indmax)
  td.appendChild(this.paneListeRep.getTab())
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  if (modification) {
    $(this.inputName).val(calc.nomCalcul)
    $(this.inputName).attr('disabled', true)
  }
  this.create(this.title, 450)
}

InfoRepDlg.prototype = new MtgDlg()

InfoRepDlg.prototype.OK = function () {
  const calc = this.calc
  if (this.editeurName.validate()) {
    calc.rep = this.paneListeRep.getSelectedRep()
    if (!this.modification) {
      calc.nomCalcul = $(this.inputName).val()
      this.app.ajouteElement(calc)
    }
    this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : this.title)
    this.destroy()
  }
}

InfoRepDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputName)
}
