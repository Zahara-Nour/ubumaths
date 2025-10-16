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
import Nat from '../types/Nat'
export default TestDepVarDlg

/**
 *
 * @param {MtgApp} app
 * @param test
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function TestDepVarDlg (app, test, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  this.test = test
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(test) - 1 : -1
  this.inf = list.listeParNatCal(app, NatCal.NTteFoncRouC, indmax)
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
  $(label).html(getStr('NomCalcul') + ' : ')
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
    $(input).val(test.nomCalcul)
    $(input).attr('disabled', true)
  }
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('suiteRecDlg2') + ' : ')
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
    if (modification ? (this.inf.pointeurs[i] === test.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  // Un ligne pour choisir par rapport à quelle variable on teste la dépendance
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
  $(label).html(getStr('DepRap'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.select2 = ce('select', {
    size: 3// Le nombre de lignes visibles par défaut
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
  for (let j = 0; j < test.nbVar; j++) {
    if (j === test.indiceVariableDerivation) $('#option' + j).attr('selected', 'selected')
  }
  this.onSelectChange(true)
  this.create('TestDepVar', 500)
}

TestDepVarDlg.prototype = new MtgDlg()

TestDepVarDlg.prototype.onSelectChange = function (binit) {
  let option
  const ind = this.select.selectedIndex
  const fonc = this.inf.pointeurs[ind]
  $('#mtginfo').val(fonc.infoHist())
  empty(this.select2)
  if (fonc.estDeNatureCalcul(Nat.or(NatCal.NFonctionReelle1Variable, NatCal.NFonctionComplexe))) {
    option = ce('Option', {
      class: 'mtgOption',
      id: 'option0'
    })
    $(option).html(fonc.nomsVariables)
    $(option).attr('selected', 'selected')
    this.select2.appendChild(option)
  } else {
    for (let i = 0; i < fonc.nbVar; i++) {
      option = ce('Option', {
        class: 'mtgOption',
        id: 'option' + i
      })
      $(option).html(fonc.getVariable()[i])
      const indsel = binit ? this.test.indiceVariable : 0
      if (i === indsel) $(option).attr('selected', 'selected')
      this.select2.appendChild(option)
    }
  }
}

TestDepVarDlg.prototype.OK = function () {
  const app = this.app
  // if (app.lastDlgId() !== this.id) return;
  if (this.editeurName.validate()) {
    if (!this.modification) this.test.nomCalcul = $('#mtginput').val()
    this.test.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
    this.test.indiceVariable = this.select2.selectedIndex
    if (!this.modification) app.ajouteElement(this.test)
    app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'TestDepVar')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  }
}

TestDepVarDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.select2 : 'mtginput')
}
