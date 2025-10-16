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
//
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
export default TestEqFactDlg

/**
 * Boîte de dialogue servant à créer un test d'équivalence ou un test de factorisation
 * @param {MtgApp} app L'application associée
 * @param {CTestEquivalence|CTestFact} test Le test d'équivalence ou de factorisation associé
 * @param {boolean} modification true si on modifie un objet déjà créé
 * @param {boolean} bTestEq true si on modifie un test d'équivalnece, false pour un test de factorisation
 * @param {function} callBackOK function appelée si l'utilisateur valide ou null
 * @param {function} callBackCancel  Fonction appelée si l'utilisateur ferme la boîte de dialogue ou null
 * @constructor
 */
function TestEqFactDlg (app, test, modification, bTestEq, callBackOK, callBackCancel) {
  let option
  MtgDlg.call(this, app, 'TestEq', callBackOK, callBackCancel)
  this.test = test
  this.modification = modification
  const list = app.listePr
  // La formule obtenue pour le calcul de la condition d'existence
  this.valeur = new CValeur(list)
  const self = this
  const indmax = modification ? list.indexOf(test) - 1 : list.longueur() - 1
  this.indmax = indmax
  this.infleft = list.listeParNatCal(app, NatCal.NCalcouFoncParFormule, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  div.appendChild(label)
  const inputName = getMtgInput({
    id: 'inputName'
  })
  inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }

  div.appendChild(inputName)
  if (modification) {
    $(inputName).val(test.nomCalcul)
    $(inputName).attr('disabled', true)
  }
  tr = ce('tr')
  tabHaut.appendChild(tr)
  label = ce('label')
  $(label).html(getStr(bTestEq ? 'AComp' : 'FacComp'))
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
  this.selectleft.onchange = function () {
    self.onSelectChange()
  }
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
  div = ce('div')
  tdleft.appendChild(div)
  const cbleft = ce('input', {
    type: 'checkbox',
    id: 'cbleft'
  })
  div.appendChild(cbleft)
  label = ce('label', {
    for: 'cbleft'
  })
  $(label).html(getStr('RempVal'))
  div.appendChild(label)
  if (test.remplacementValeurs1) $(cbleft).attr('checked', 'checked')
  // On ajoute une checkbox pour le remplacement ou non des multiplications par 1 du calcul de gauche
  div = ce('div')
  tdleft.appendChild(div)
  const cbremp1left = ce('input', {
    type: 'checkbox',
    id: 'cbremp1left'
  })
  div.appendChild(cbremp1left)
  label = ce('label', {
    for: 'cbremp1left',
    id: 'lblremp1left'
  })
  $(label).html(getStr('SupMul1'))
  div.appendChild(label)
  if (test.eliminMultUn1) $(cbremp1left).attr('checked', 'checked')
  const remp1 = test.remplacementValeurs1
  $(cbremp1left).css('visibility', remp1 ? 'visible' : 'hidden')
  $(label).css('visibility', remp1 ? 'visible' : 'hidden')
  cbleft.onclick = () => {
    const b = $(cbleft).prop('checked')
    $('#cbremp1left').css('visibility', b ? 'visible' : 'hidden')
    $('#lblremp1left').css('visibility', b ? 'visible' : 'hidden')
  }

  const sel = this.infleft.pointeurs[this.selectleft.selectedIndex]
  this.infright = list.listeParNatCal(app, sel.getNatureCalcul(), indmax, sel)
  const tdright = ce('td')
  tabCentre.appendChild(tdright)

  this.selectright = ce('select', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })
  tdright.appendChild(this.selectright)

  div = ce('div')
  tdright.appendChild(div)
  const cbright = ce('input', {
    type: 'checkbox',
    id: 'cbright'
  })
  div.appendChild(cbright)
  label = ce('label', {
    for: 'cbright'
  })
  $(label).html(getStr('RempVal'))
  div.appendChild(label)
  if (test.remplacementValeurs2) $(cbright).attr('checked', 'checked')
  // On ajoute une checkbox pour le remplacement ou non des multiplications par 1 du calcul de droite
  div = ce('div')
  tdright.appendChild(div)
  const cbremp1right = ce('input', {
    type: 'checkbox',
    id: 'cbremp1right'
  })
  div.appendChild(cbremp1right)
  label = ce('label', {
    for: 'cbremp1right',
    id: 'lblremp1right'
  })
  $(label).html(getStr('SupMul1'))
  div.appendChild(label)
  if (test.eliminMultUn2) $(cbremp1right).attr('checked', 'checked')
  const remp2 = test.remplacementValeurs2
  $(cbremp1right).css('visibility', remp2 ? 'visible' : 'hidden')
  $(label).css('visibility', remp2 ? 'visible' : 'hidden')
  cbright.onclick = () => {
    const b = $(cbright).prop('checked')
    $('#cbremp1right').css('visibility', b ? 'visible' : 'hidden')
    $('#lblremp1right').css('visibility', b ? 'visible' : 'hidden')
  }

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cbeq = ce('input', {
    type: 'checkbox',
    id: 'cbeq'
  })
  div.appendChild(cbeq)
  label = ce('label', {
    for: 'cbeq'
  })
  $(label).html(getStr('EqDecFr'))
  div.appendChild(label)
  if (test.equivalenceDecimalFracIrr) $(cbeq).attr('checked', 'checked')

  tr = ce('tr')
  tabPrincipal.appendChild(tr)

  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('CondEx') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputCond = getMtgInput()
  td.appendChild(this.inputCond)
  $(this.inputCond).val(test.test.chaineInfo())
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputCond, true, indmax)
  tabBas.appendChild(paneBoutonsValFonc)

  this.editeurName = new EditeurNomCalcul(app, !modification, inputName)
  this.editeurFormule = new EditeurvaleurReelle(app, this.inputCond, indmax, this.valeur, null)
  this.onSelectChange(modification ? test.calcul2 : null) // Met à jour la liste de droite en fonction de l'élément sélectionné à gauche
  this.create(bTestEq ? 'TestEq' : 'TestFact', 600)
}

TestEqFactDlg.prototype = new MtgDlg()

TestEqFactDlg.prototype.onSelectChange = function (calc = null) {
  let i, option
  const list = this.app.listePr
  for (i = this.selectright.options.length - 1; i >= 0; i--) this.selectright.remove(i)
  const sel = this.infleft.pointeurs[this.selectleft.selectedIndex]
  this.infright = list.listeParNatCal(this.app, sel.getNatureCalcul(), this.indmax, sel)
  for (i = 0; i < this.infright.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if ((calc === null && i === 0) || calc === this.infright.pointeurs[i]) { option.setAttribute('selected', 'selected') }
    $(option).html(this.infright.noms[i])
    this.selectright.appendChild(option)
  }
}

TestEqFactDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    if (this.editeurFormule.validate($(this.inputFormula).val())) {
      if (!this.modification) this.test.nomCalcul = $('#inputName').val()
      if (this.selectright.selectedIndex === -1) {
        // Pas d'autres calculs de même nature que le calcul sélectionné à gauche
        new AvertDlg(this.app, 'Incorrect')
        return
      }
      this.test.test = this.valeur
      this.test.calcul1 = this.infleft.pointeurs[this.selectleft.selectedIndex]
      this.test.calcul2 = this.infright.pointeurs[this.selectright.selectedIndex]
      this.test.remplacementValeurs1 = $('#cbleft').prop('checked')
      this.test.remplacementValeurs2 = $('#cbright').prop('checked')
      this.test.equivalenceDecimalFracIrr = $('#cbeq').prop('checked')
      this.test.eliminMultUn1 = $('#cbremp1left').prop('checked')
      this.test.eliminMultUn2 = $('#cbremp1right').prop('checked')
      if (!this.modification) this.app.ajouteElement(this.test)
      this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : (this.test.className === 'CTestFact' ? 'TestFact' : 'TestEq'))
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    } else this.inputCond.focus()
  }
}

TestEqFactDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.selectleft : 'inputName')
}
