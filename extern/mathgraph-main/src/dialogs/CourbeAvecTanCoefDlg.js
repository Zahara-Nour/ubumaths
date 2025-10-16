/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, preventDefault, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import { getMtgInput } from './dom'
import EditeurValeurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import $ from 'jquery'
export default CourbeAvecTanCoefDlg

/**
 * Boîte de dialogue pour entrer les coefficients directeurs des tangentes d'une courbe définie par des points (de 2 à 9)
 * @param {MtgApp} app L'application proprétaire
 * @param tabCal Array de CCalcul qui contiennent les formules pour les coefficients directeurs (initialisés à 0)
 * @param tabPoints Array dont les éléments pointent sur les points en lesquels chaque tangenet est tracée.
 * @param indmax L'indice maximum dans la liste des objets que les formules entrées peuvent utiliser
 * @param callBackOK Fonction de callBack a apeller quand l'utilisateur clique sur OK
 * @param callBackCancel Fonction de callBack à apeller quand l'utilisateur clique sur Cancel
 * @constructor
 */
function CourbeAvecTanCoefDlg (app, tabCal, tabPoints, indmax, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbeAvecTanCoeffDlg', callBackOK, callBackCancel)
  this.tabCal = tabCal
  this.indmax = indmax
  this.nbPoints = tabCal.length
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  let tr = ce('tr')
  let label = ce('label')
  let td = ce('td', {
    style: 'vertical-align:top;'
  })
  const tabLeft = ce('table')
  const tabEdit = ce('table')
  this.oldSelIndex = 0 // Pour pouvoir quand on change la sélection de gauche affecter le contenu de l'éditeur de formule s'il est correct
  this.appendChild(tabPrincipal)
  tabPrincipal.appendChild(td)
  td.appendChild(tabLeft)
  td.appendChild(tr)
  $(label).html(getStr('CourbeAvecTanDlg4'))
  tr.appendChild(label)
  tr = ce('tr')
  td.appendChild(tr)
  const select = ce('select', {
    style: 'width:80px;',
    size: this.nbPoints // Le nombre de lignes visibles par défaut
  })
  this.select = select
  td.appendChild(select)
  for (let i = 0; i < this.nbPoints; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(tabPoints[i].nom)
    select.appendChild(option)
  }
  select.onchange = function () { self.onSelectChange() }
  td = ce('td', {
    style: 'vertical-align:top;'
  })
  tabPrincipal.appendChild(td)
  td.appendChild(tabEdit)
  tr = ce('tr')
  tabEdit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('CoefDir') + ' :')
  td.appendChild(label)
  tr = ce('tr')
  tabEdit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  this.input = getMtgInput({
    size: 16
  })
  $(this.input).val('0')
  td.appendChild(this.input)
  this.input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      if (self.validateInput(self.select.selectedIndex)) self.selectNext()
    }
  }
  this.input.onkeydown = function (ev) {
    if (ev.keyCode === 9) {
      preventDefault(ev)
      self.selectNext()
    } // Tab key
  }
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.input, true, indmax, false)
  tabEdit.appendChild(paneBoutonsValFonc)

  setTimeout(function () { self.onSelectChange() }, 500)

  // Un seul bouton Fermer pour cette boîte de dialogue
  const buttons = {}
  buttons[getStr('Term')] = function (ev) {
    self.stopEvent(ev)
    if (self.validateInput(self.select.selectedIndex)) {
      self.destroy()
      self.callBackOK()
    }
  }
  buttons[getStr('Cancel')] = function (ev) {
    self.stopEvent(ev)
    self.callBackCancel()
    self.destroy()
  }

  // Attention : Pour cette boîte de dialogue ne pas appeler create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('CourbeAvecTanDlg3'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.stopEvent(ev)
      self.destroy()
    },
    width: 280,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'right top', at: 'right top', of: this.app.svg.parentElement }
  })
}

CourbeAvecTanCoefDlg.prototype = new MtgDlg()

CourbeAvecTanCoefDlg.prototype.validateInput = function (index) {
  const app = this.app
  const list = app.listePr
  const valeur = new CValeur(list) // Sert à éditer les formules
  const editeur = new EditeurValeurReelle(app, this.input, this.indmax, valeur, null)
  if (editeur.validate($(this.input).val())) {
    const calc = this.tabCal[index]
    calc.calcul = valeur.calcul
    calc.chaineCalcul = replaceSepDecVirg(app, valeur.calcul)
    list.positionneDependantsDe(false, app.dimf, calc)
    list.updateDependants(calc, app.svgFigure, app.doc.couleurFond, true)
    return true
  } else {
    this.input.focus()
    return false
  }
}

CourbeAvecTanCoefDlg.prototype.selectNext = function () {
  this.oldSelIndex = this.select.selectedIndex
  this.select.selectedIndex = (this.select.selectedIndex + 1) % this.nbPoints
  this.onSelectChange()
}

CourbeAvecTanCoefDlg.prototype.onSelectChange = function () {
  if (this.validateInput(this.oldSelIndex)) {
    this.oldSelIndex = this.select.selectedIndex
    // Modification version 7.0 : On reconstruit les chaînes de calcul
    // $(this.input).val(this.tabCal[this.oldSelIndex].chaineCalcul)
    $(this.input).val(replaceSepDecVirg(this.app, this.tabCal[this.oldSelIndex].calcul))
  } else this.select.selectedIndex = this.oldSelIndex
  $(this.input).focus()
  $(this.input).select()
}
