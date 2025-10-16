/*
 * Created by yvesb on 07/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, empty } from '../kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import { getMtgInput } from './dom'
import NatCal from '../types/NatCal'
import Nat from 'src/types/Nat'
export default DeriveePartDlg

/**
 *
 * @param {MtgApp} app
 * @param der
 * @param modification
 * @param {VoidCallback} callBackOK
 * @param {VoidCallback} callBackCancel
 * @constructor
 */
function DeriveePartDlg (app, der, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  this.der = der
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(der) - 1 : -1
  this.inf = modification ? this.listeFoncNVar() : list.listeParNatCal(app, NatCal.NFoncRNvar, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('DerPartDlg1'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  td.appendChild(input)
  if (modification) {
    $(input).val(der.nomCalcul)
    $(input).attr('disabled', true)
  }
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('DerDlg2'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.select = ce('SELECT', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.inf.pointeurs[i] === der.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  // Un ligne pour choisir par rapport à qui on dérive
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabMilieu = ce('table')
  tr.appendChild(tabMilieu)
  tr = ce('tr')
  tabMilieu.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('DerPartDlg2'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.select2 = ce('SELECT', {
    size: 4// Le nombre de lignes visibles par défaut
    // style : "width:180px",
  })
  td.appendChild(this.select2)

  // En bas du tableau un champ d'info sur la fonction sélectionnée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InfoFonc'))
  tr.appendChild(label)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'mtginfo',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  tr.appendChild(inputinf)
  this.editeurName = new EditeurNomCalcul(app, !this.modification, input)
  for (let j = 0; j < der.nbVar; j++) {
    if (j === der.indiceVariableDerivation) $('#option' + j).attr('selected', 'selected')
  }
  this.onSelectChange(true)
  this.create('Der', 500)
}

DeriveePartDlg.prototype = new MtgDlg()

/**
 * Fonction appelée quand on modifie une dérivée partielle déjà créée
 * On ne propose alors que les fonctions réelles de n variables ou les dérivées partielles de fonctions de n variables
 * où n est le nombre de variables de la fonctiont que l'on a modifié
 * @returns {{noms: string[], pointeurs: COb[]}}
 */
DeriveePartDlg.prototype.listeFoncNVar = function () {
  const list = this.app.listePr
  const nbvar = this.der.nombreVariables() // Le nombre de variables de la dérivée partielle qu'on modifie
  const pointeurs = []
  const noms = []
  const indfin = list.indexOf(this.der) - 1
  for (let i = 0; i <= indfin; i++) {
    const el = list.get(i)
    if (!el.estElementIntermediaire()) {
      if (el.estDeNatureCalcul(Nat.or(NatCal.NFoncRNvar, NatCal.NDeriveePartielle))) {
        if (el.nombreVariables() === nbvar) {
          pointeurs.push(el)
          noms.push(el.getNom())
        }
      }
    }
  }
  return { pointeurs, noms }
}

DeriveePartDlg.prototype.onSelectChange = function (binit) {
  const ind = this.select.selectedIndex
  const fonc = this.inf.pointeurs[ind]
  $('#mtginfo').val(fonc.infoHist())
  empty(this.select2)
  for (let i = 0; i < fonc.nbVar; i++) {
    const option = ce('Option', {
      class: 'mtgOption',
      id: 'option' + i
    })
    $(option).html(fonc.getVariable()[i])
    const indsel = binit ? this.der.indiceVariableDerivation : 0
    if (i === indsel) $(option).attr('selected', 'selected')
    this.select2.appendChild(option)
  }
}

DeriveePartDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.select2 : 'mtginput')
}

DeriveePartDlg.prototype.OK = function () {
  const app = this.app
  // if (app.lastDlgId() !== this.id) return;
  if (this.editeurName.validate()) {
    if (!this.modification) this.der.nomCalcul = $('#mtginput').val()
    this.der.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
    this.der.nbVar = this.der.fonctionAssociee.nombreVariables()
    this.der.indiceVariableDerivation = this.select2.selectedIndex
    if (!this.modification) app.ajouteElement(this.der)
    app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'DeriveePart')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}
