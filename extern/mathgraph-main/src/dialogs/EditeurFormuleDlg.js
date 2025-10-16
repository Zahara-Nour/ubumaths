/*
 * Created by yvesb on 14/05/2017.
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
import NatCal from '../types/NatCal'
import PaneModeAffichage from './PaneModeAffichage'
import PaneTaillePolice from './PaneTaillePolice'
import MtgInputWithCharSpe from './MtgInputWithCharSpe'
import addQueue from 'src/kernel/addQueue'

import $ from 'jquery'
import 'jquery-textrange'

export default EditeurFormuleDlg

/**
 *
 * @param {MtgApp} app
 * @param editeur L'éditeur de formule à modifier
 * @param modification true si on modifie un éditeur déjà présent dans la figure
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annulation
 * @constructor
 */
function EditeurFormuleDlg (app, editeur, modification, callBackOK, callBackCancel) {
  let i, option, td, caption
  MtgDlg.call(this, app, 'DeriveeDlg', callBackOK, callBackCancel)
  this.editeur = editeur
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(editeur) - 1 : -1
  this.inf = list.listeParNatCal(app, NatCal.NCalculOuFonctionParFormule, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  if (!this.editeur.estElementFinal) {
    td = ce('td')
    $(td).css('vertical-align', 'top')
    tr.appendChild(td)
    caption = ce('caption', {
      class: 'mtgcaption',
      style: 'width:180px'
    })
    $(caption).html(getStr('EditForDlg1'))
    td.appendChild(caption)
    this.selectCalc = ce('SELECT', {
      size: 6, // Le nombre de lignes visibles par défaut
      style: 'width:180px'
    })
    this.selectCalc.onchange = function () {
      self.onSelectChange()
    }
    td.appendChild(this.selectCalc)
    // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
    for (i = 0; i < this.inf.noms.length; i++) {
      option = ce('Option', {
        class: 'mtgOption'
      })
      if (modification ? (this.inf.pointeurs[i] === editeur.calculAssocie) : i === 0) option.setAttribute('selected', 'selected')
      $(option).html(this.inf.noms[i])
      this.selectCalc.appendChild(option)
    }
  }
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:60px'
  })
  $(caption).html(getStr('Colonnes'))
  td.appendChild(caption)
  this.selectNbcol = ce('SELECT', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:60px'
  })
  for (i = 1; i <= 50; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (editeur.nbcol === i) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.selectNbcol.appendChild(option)
  }
  td.appendChild(this.selectNbcol)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  this.paneModeAffichage = new PaneModeAffichage(this, false, editeur.effacementFond,
    editeur.encadrement, editeur.couleurFond)
  td.appendChild(this.paneModeAffichage.container)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(editeur.taillePolice)
  td.appendChild(this.paneTaillePolice.container)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabEntete = ce('table')
  tr.appendChild(tabEntete)
  td = ce('td')
  tabEntete.appendChild(td)
  const tabEnTeteGauche = ce('table')
  td.appendChild(tabEnTeteGauche)
  tr = ce('tr')
  tabEnTeteGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('EnTete'))
  td = ce('td')
  tr.appendChild(td)
  const input = new MtgInputWithCharSpe(app, { id: 'entete' }, ['grec', 'math', 'arrows'], false, this)
  td.appendChild(input)
  tr = ce('tr')
  tabEnTeteGauche.appendChild(tr)
  tr.appendChild(ce('td'))
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('EditForDlg2'))
  td.appendChild(label)
  td = ce('td')
  tabEntete.appendChild(td)
  let div = ce('div')
  td.appendChild(div)
  // CheckBox pour le signes de multiplication implicites
  const cb1 = ce('input', {
    id: 'cb1',
    type: 'checkbox'
  })
  div.appendChild(cb1)
  label = ce('label', {
    for: 'cb1'
  })
  $(label).html(getStr('EditForDlg3'))
  div.appendChild(label)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)

  // CheckBox pour l'affichage de la formule en LaTeX
  tr = ce('tr')
  tabCentre.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cb2 = ce('input', {
    id: 'cb2',
    type: 'checkbox'
  })
  div.appendChild(cb2)
  // Suivant que ce chehckBox est checked ou non on montre ou pas les autres checkBoxes
  cb2.onclick = function () {
    $('#tabComp').css('visibility', ($('#cb2').prop('checked')) ? 'visible' : 'hidden')
  }
  label = ce('label', {
    for: 'cb2'
  })
  $(label).html(getStr('EditForDlg4'))
  div.appendChild(label)
  tr = ce('tr')
  tabCentre.appendChild(tr)
  const tabComp = ce('table', {
    id: 'tabComp'
  })
  tr.appendChild(tabComp)
  tr = ce('tr')
  tabComp.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('EditForDlg5'))
  div.appendChild(label)
  const inputprecode = ce('input', {
    id: 'precode',
    type: 'text'
  })
  div.appendChild(inputprecode)
  // Un checkBox pour l'affichage initial de la formule
  tr = ce('tr')
  tabComp.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cb3 = ce('input', {
    id: 'cb3',
    type: 'checkbox'
  })
  div.appendChild(cb3)
  label = ce('label', {
    for: 'cb3'
  })
  $(label).html(getStr('EditForDlg6'))
  div.appendChild(label)
  // Un checkBox pour l'affichage en temps réel de la formule
  tr = ce('tr')
  tabComp.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const cb4 = ce('input', {
    id: 'cb4',
    type: 'checkbox'
  })
  div.appendChild(cb4)
  label = ce('label', {
    for: 'cb4'
  })
  $(label).html(getStr('EditForDlg7'))
  div.appendChild(label)

  // En bas du tableau un champ d'info sur la fonction sélectionnée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
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

  $('#entete').val(editeur.enTete)
  $('#precode').val(editeur.preCodeLaTeX)
  if (editeur.variables1Car) $('#cb1').attr('checked', 'checked')
  if (editeur.affichageFormule) $('#cb2').attr('checked', 'checked')
  if (editeur.affLaTeXPremierAffichage) $('#cb3').attr('checked', 'checked')
  if (editeur.affichageTempsReel) $('#cb4').attr('checked', 'checked')
  if (!editeur.affichageFormule) $('#tabComp').css('visibility', 'hidden')

  this.onSelectChange()
  this.create('EditeurFormule', 650)
}

EditeurFormuleDlg.prototype = new MtgDlg()

EditeurFormuleDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  this.paneModeAffichage.init()
}

EditeurFormuleDlg.prototype.onSelectChange = function () {
  if (this.editeur.estElementFinal) return
  const ind = this.selectCalc.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

EditeurFormuleDlg.prototype.OK = function () {
  const app = this.app
  const self = this
  const edit = this.editeur
  const svg = app.svgFigure
  const doc = app.doc
  const couleurFond = doc.couleurFond
  // edit.removegElement(svg);
  edit.deleteEditor() // Pour détruire le foreign object associé à l'éditeur
  /*
  if (this.modification) {
    oldg = edit.g
    if (edit.affichageFormule) {
      const oldglatex = edit.glatex
      if (oldglatex && svg.contains(oldglatex)) {
        svg.removeChild(oldglatex)
      }
    }
  }
   */
  // const affichageFormuleInit = edit.affichageFormule
  if (!edit.estElementFinal) edit.calculAssocie = this.inf.pointeurs[this.selectCalc.selectedIndex]
  edit.taillePolice = this.paneTaillePolice.getTaille()
  edit.nbcol = this.selectNbcol.selectedIndex + 1
  edit.enTete = $('#entete').val()
  edit.preCodeLaTeX = $('#precode').val()
  edit.variables1Car = $('#cb1').prop('checked')
  edit.affichageFormule = $('#cb2').prop('checked')
  edit.affLaTeXPremierAffichage = $('#cb3').prop('checked')
  edit.affichageTempsReel = $('#cb4').prop('checked')
  const pma = this.paneModeAffichage
  edit.encadrement = pma.getStyleEnc()
  edit.effacementFond = pma.getEffFond()
  edit.couleurFond = pma.getColor()
  edit.creeEditeur(svg)
  edit.positionne(false, app.dimf)
  edit.setReady4MathJax()
  addQueue(function () {
    self.editeur.creeAffichage(app.svgFigure, false, couleurFond)
    if (self.callBackOK) self.callBackOK()
    if (self.modification) app.gestionnaire.enregistreFigureEnCours('ModifObj')
    self.destroy()
  })
}
