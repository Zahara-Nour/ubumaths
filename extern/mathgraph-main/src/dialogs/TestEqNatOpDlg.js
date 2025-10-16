/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import 'jquery-textrange'
import { getMtgInput } from './dom'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'

export default TestEqNatOpDlg

/**
 * Boîte de dialogue servant à créer un test de nature d'opérateur
 * @param {MtgApp} app L'application associée
 * @param {CTestEquivalence} test Le test d'équivalence ou de factorisation associé
 * @param {boolean} modification true si on modifie un objet déjà créé
 * @param {function} callBackOK function appelée si l'utilisateur valide ou null
 * @param {function} callBackCancel  Fonction appelée si l'utilisateur ferme la boîte de dialogue ou null
 * @constructor
 */
function TestEqNatOpDlg (app, test, modification, callBackOK, callBackCancel) {
  let option
  MtgDlg.call(this, app, 'TestEqNatOp', callBackOK, callBackCancel)
  this.test = test
  this.modification = modification
  const list = app.listePr
  // La formule obtenue pour le calcul de la condition d'existence
  this.valeur = new CValeur(list)
  const indmax = modification ? list.indexOf(test) - 1 : list.longueur() - 1
  this.infleft = list.listeParNatCal(app, NatCal.NCalcouFoncParFormule, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  div.appendChild(label)
  const inputName = getMtgInput({
    id: 'inputName'
  })
  div.appendChild(inputName)
  if (modification) {
    $(inputName).val(test.nomCalcul)
    $(inputName).attr('disabled', true)
  }
  tr = ce('tr')
  tabHaut.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('AComp'))
  tr.appendChild(label)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)

  const tdleft = ce('td')
  tabCentre.appendChild(tdleft)

  this.selectleft = ce('select', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })
  tdleft.appendChild(this.selectleft)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.infleft.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.infleft.pointeurs[i] === test.calcul1) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.infleft.noms[i])
    this.selectleft.appendChild(option)
  }

  this.infright = list.listeParNatCal(app, NatCal.NCalcouFoncParFormule, indmax)
  const tdright = ce('td')
  tabCentre.appendChild(tdright)

  this.selectright = ce('select', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })
  tdright.appendChild(this.selectright)
  for (let i = 0; i < this.infright.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.infright.pointeurs[i] === test.calcul2) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.infright.noms[i])
    this.selectright.appendChild(option)
  }

  this.editeurName = new EditeurNomCalcul(app, !modification, inputName)
  this.create('TestEqNatOp', 550)
}

TestEqNatOpDlg.prototype = new MtgDlg()

TestEqNatOpDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    if (!this.modification) this.test.nomCalcul = $('#inputName').val()
    this.test.calcul1 = this.infleft.pointeurs[this.selectleft.selectedIndex]
    this.test.calcul2 = this.infright.pointeurs[this.selectright.selectedIndex]
    if (!this.modification) this.app.ajouteElement(this.test)
    this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'TestEqNatOp')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}

TestEqNatOpDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.selectleft : 'inputName')
}
