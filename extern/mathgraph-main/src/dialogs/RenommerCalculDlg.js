/*
 * Created by yvesb on 15/05/2017.
 */
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
import NatCal from '../types/NatCal'
import EditeurNomCalcul from './EditeurNomCalcul'
import { getMtgInput } from './dom'
export default RenommerCalculDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function RenommerCalculDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  const self = this
  // Un seul bouton Fermer pour cette boîte de dialogue
  const buttons = {}
  buttons[getStr('Fermer')] = function (ev) {
    self.stopEvent(ev)
    self.destroy()
    self.callBackOK()
  }

  const list = app.listePr
  this.inf = list.listeParNatCal(app, NatCal.NTtCalcNommeSaufConst, -1)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:180px'
  })
  $(caption).html(getStr('EditForDlg1'))
  td.appendChild(caption)
  this.selectCalc = ce('SELECT', {
    size: 12, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.selectCalc.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.selectCalc)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.selectCalc.appendChild(option)
  }
  td = ce('td')
  tr.appendChild(td)
  const tabDroit = ce('table')
  tr.appendChild(tabDroit)
  tr = ce('tr')
  tabDroit.appendChild(tr)
  let label = ce('label')
  $(label).html(getStr('RenCalcDlg'))
  tr.appendChild(label)
  const inputName = getMtgInput({
    id: 'inputname'
  })
  tr = ce('tr')
  tabDroit.appendChild(tr)
  inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.onBtnRenommer()
    }
  }
  tr.appendChild(inputName)
  tr = ce('tr')
  tabDroit.appendChild(tr)
  const btnRenommer = ce('button', {
    tabindex: -1
  })
  btnRenommer.onclick = function () { self.onBtnRenommer() }
  $(btnRenommer).html(getStr('Renommer'))
  tr.appendChild(btnRenommer)

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
    cols: 60,
    rows: 3
  })
  tr.appendChild(inputinf)
  this.editeurName = new EditeurNomCalcul(app, true, inputName)
  this.onSelectChange()

  // Attention : Pour cette boîte de dialogue ne pas appeler create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('RenommerCalcul'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.stopEvent(ev)
      self.destroy()
    },
    width: 520,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

RenommerCalculDlg.prototype = new MtgDlg()

RenommerCalculDlg.prototype.onSelectChange = function () {
  const ind = this.selectCalc.selectedIndex
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
  $('#inputname').val(el.nomCalcul)
}

RenommerCalculDlg.prototype.onBtnRenommer = function () {
  if (this.editeurName.validate()) {
    const ind = this.selectCalc.selectedIndex
    const el = this.inf.pointeurs[ind]
    const chNom = $('#inputname').val()
    const app = this.app
    const list = app.listePr
    list.remplaceNomValeurDynamiqueDansCommentairesOuLatexDepDe(el.nomCalcul, chNom, el)
    el.nomCalcul = chNom
    list.reconstruitChainesCalculDepDe(el)
    list.determineDependancesCommentaires()
    if (el.getNatureCalcul() === NatCal.NVariable) {
      app.removePaneVariables()
      list.creePaneVariables()
    }
    this.updateList()
    this.selectCalc.selectedIndex = ind
    this.app.outilRenommerCalcul.saveFig()
  }
}

RenommerCalculDlg.prototype.updateList = function () {
  let i, option
  const liste = this.app.listePr
  for (i = this.selectCalc.options.length - 1; i >= 0; i--) this.selectCalc.remove(i)
  this.inf = liste.listeParNatCal(this.app, NatCal.NTtCalcNommeSaufConst, -1)
  for (i = 0; i < this.inf.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.selectCalc.appendChild(option)
  }
}
