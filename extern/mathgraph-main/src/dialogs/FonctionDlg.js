/*
 * Created by yvesb on 06/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, empty } from '../kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import EditeurValeurComplexe from './EditeurValeurComplexe'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import CValeurComp from '../objets/CValeurComp'
import CFoncNVar from 'src/objets/CFoncNVar'
import AvertDlg from './AvertDlg'
import NatCal from '../types/NatCal'
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'
export default FonctionDlg

/**
 * Dialogue de création ou modification d'une fonction réelle ou complexe
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param fonc La fonction dont la formule doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier un calcul déjà existant
 * @param bReel {boolean} : true pour une foonction réelle et false pour un fonction complexe
 * @param callBackOK Fonction de callBack a apeller quand l'utilisateur clique sur OK
 * @param callBackCancel Fonction de callBack à apeller quand l'utilisateur clique sur Cancel
 */
function FonctionDlg (app, fonc, modification, bReel, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'fonctiondlg', callBackOK, callBackCancel)
  const self = this
  this.fonc = fonc
  this.modification = modification
  this.bReel = bReel
  const list = app.listePr
  // La formule obtenue pour le calcul sera renvoyée dans un CValeur
  this.valeur = bReel ? new CValeur(list) : new CValeurComp(list)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const tabHaut = ce('table')
  td.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('NomFonction') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  const nomvar = fonc.variableFormelle()
  this.nbVar = nomvar.length
  if (nomvar.length === 1) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    this.tabEdit = ce('table')
    tr.appendChild(this.tabEdit)
  } else {
    // Version 6.8.0 : On donne la possibilité de changer le nombre de variables
    // si la boîte de dialogue est appelée pour une création
    if (!this.modification) {
      tr = ce('tr')
      tabPrincipal.appendChild(tr)
      const paneNbVar = ce('table')
      tr.appendChild(paneNbVar)
      tr = ce('tr')
      paneNbVar.appendChild(tr)
      td = ce('td')
      tr.appendChild(td)
      label = ce('label')
      $(label).html(getStr('NbVar'))
      td.appendChild(label)
      td = ce('td')
      tr.appendChild(td)
      this.select = ce('select', {
        size: 4 // Le nombre de lignes visibles par défaut
      })
      this.select.onchange = function () {
        self.resetEditeurs(false)
      }
      for (let i = 1; i < 6; i++) {
        const option = ce('option', {
          class: 'mtgOption'
        })
        $(option).html(i + 1)
        this.select.appendChild(option)
      }
      this.select.selectedIndex = nomvar.length - 2
      td.appendChild(this.select)
    }
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    td = ce('td', {
      style: 'overflow: auto;'
    })
    tr.appendChild(td)
    const div = ce('div', {
      style: 'width:650px;height:125px;'
    })
    td.appendChild(div)
    this.tabEdit = ce('table')
    div.appendChild(this.tabEdit)
  }
  this.resetEditeurs(true)
  //
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabForm = ce('tab')
  tr.appendChild(tabForm)
  tr = ce('tr')
  tabForm.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Formule') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputFormula = getMtgInput({
    size: 50
  })
  td.appendChild(this.inputFormula)
  this.inputFormula.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      if ($(self.inputFormula).val() === '') self.inputFormula.focus()
      else {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }
  if (modification) {
    $(this.inputName).val(fonc.nomCalcul)
    this.inputName.setAttribute('disabled', true)
    // Modification version 7.0 : On reconstruit la chaîne de calcul
    // $(this.inputFormula).val(fonc.chaineCalcul)
    $(this.inputFormula).val(replaceSepDecVirg(app, fonc.calcul, fonc.variableFormelle()))
  }
  const indmax = modification ? app.listePr.indexOf(fonc) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputFormula, bReel, indmax)
  tabForm.appendChild(paneBoutonsValFonc)
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  // Si on est en train de créer une fonction et qu'il existe un repère dans la figure on rajoute une
  // checkbox proposant de tracer la courbe et un éditeur pour entre le nombre de points de la courbe
  if (!modification && fonc.estDeNatureCalcul(NatCal.NFonction)) {
    const rep = list.premierRepVis()
    if (rep !== null) {
      tr = ce('tr')
      tabPrincipal.appendChild(tr)
      const tab2 = ce('table')
      tr.appendChild(tab2)
      tr = ce('tr')
      $(tr).css('vertical-align', 'middle')
      tab2.appendChild(tr)
      td = ce('td')
      tr.appendChild(td)
      label = ce('label', {
        for: 'cbc'
      })
      $(label).html(getStr('TracerCourbe') + ' : ')
      td.appendChild(label)
      td = ce('td')
      tr.appendChild(td)
      this.cbCourbe = ce('input', {
        id: 'cbc',
        type: 'checkBox'
      })
      this.cbCourbe.setAttribute('checked', 'checked')
      this.cbCourbe.onclick = function () {
        const b = $(self.cbCourbe).prop('checked')
        $(self.tabListeRep).css('visibility', b ? 'visible' : 'hidden')
        $(self.inputNbPts).css('visibility', b ? 'visible' : 'hidden')
        $(self.labelNbPts).css('visibility', b ? 'visible' : 'hidden')
      }
      td.appendChild(this.cbCourbe)
      td = ce('td')
      $(td).css('vertical-align', 'middle')
      tr.appendChild(td)
      this.paneListeRep = new PaneListeReperes(app, indmax)
      this.tabListeRep = this.paneListeRep.getTab()
      td.appendChild(this.tabListeRep)
      tr = ce('tr')
      tabPrincipal.appendChild(tr)
      this.labelNbPts = ce('label')
      $(this.labelNbPts).html(getStr('nbPtsCourbe') + ' : ')
      tr.appendChild(this.labelNbPts)
      this.inputNbPts = ce('input', {
        type: 'text',
        size: 5 // 4 semble trop pett sur iPad
      })
      $(this.inputNbPts).val('500')
      tr.appendChild(this.inputNbPts)
    }
  }
  this.create(this.bReel ? 'Fonction' : 'FoncComp', 700)
}

FonctionDlg.prototype = new MtgDlg()

FonctionDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputFormula : this.inputName)
}

FonctionDlg.prototype.prepareIntitules = function (bFirstTime) {
  const nbVar = bFirstTime ? this.fonc.variableFormelle().length : this.select.selectedIndex + 2
  this.intitule = []
  if (nbVar === 1) {
    this.intitule.push(getStr('Variable') + ' : ')
  } else {
    for (let i = 0; i < nbVar; i++) {
      this.intitule.push(getStr('Variable') + ' ' + String(i + 1) + ' : ')
    }
  }
}

FonctionDlg.prototype.resetEditeurs = function (bFirstCall) {
  let nomvar
  if (bFirstCall) {
    nomvar = this.fonc.variableFormelle()
  } else {
    empty(this.tabEdit)
    const ch = 'xyztab'
    const nbvar = this.select.selectedIndex + 2
    nomvar = []
    for (let i = 0; i < nbvar; i++) {
      nomvar.push(ch.charAt(i))
    }
    this.fonc = new CFoncNVar(this.app.listePr, null, false, '', '', nomvar, null)
    this.nbVar = nbvar
  }
  this.prepareIntitules(bFirstCall)
  for (let i = 0; i < nomvar.length; i++) {
    const tr = ce('tr')
    this.tabEdit.appendChild(tr)
    let td = ce('td')
    tr.appendChild(td)
    const label = ce('label')
    $(label).html(this.intitule[i])
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    this['inputNomVar' + i] = getMtgInput()
    $(this['inputNomVar' + i]).val(nomvar[i])
    // if (modification) $(this["inputNomVar" + i]).attr("disabled", true);
    td.appendChild(this['inputNomVar' + i])
    this['editeurNomVar' + i] = new EditeurNomCalcul(this.app, false, this['inputNomVar' + i])
  }
}

FonctionDlg.prototype.OK = function () {
  let nb
  const app = this.app
  const list = app.listePr
  const self = this
  // if (app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (!this.modification) {
    if (!this.editeurName.validate()) return
  }
  for (let i = 0; i < this.nbVar; i++) {
    if (!this['editeurNomVar' + i].validate()) return
  }
  const ar = []
  for (let j = 0; j < this.nbVar; j++) ar.push($(this['inputNomVar' + j]).val())
  // Si les noms pour le calcul et les variables sont corrects on passe à la formule
  let ind = this.modification ? list.indexOf(this.fonc) - 1 : list.longueur() - 1
  const editeurFormule = this.bReel
    ? new EditeurvaleurReelle(app, this.inputFormula, ind, this.valeur, ar)
    : new EditeurValeurComplexe(app, this.inputFormula, ind, this.valeur, ar)
  if (editeurFormule.validate($(this.inputFormula).val())) {
    if (!self.modification) this.fonc.nomCalcul = $(this.inputName).val()
    this.fonc.nomsVariables = (this.nbVar === 1) ? ar[0] : ar
    // Si on propose de tracer la courbe, on vérifie que le nombre de points demandés est correct
    if (!this.modification) {
      if ($(self.cbCourbe).prop('checked')) {
        nb = parseInt($(this.inputNbPts).val())
        if (nb < 4 || nb > 5000 || isNaN(nb)) {
          new AvertDlg(this.app, 'nbPtsCourbeMsg', function () {
            self.inputNbPts.focus()
          })
          return
        }
      }
    }
    this.fonc.calcul = this.valeur.calcul
    this.fonc.chaineCalcul = replaceSepDecVirg(app, this.fonc.calcul, this.fonc.variableFormelle())
    if (!this.modification) {
      ind = list.longueur()
      app.ajouteElement(this.fonc)
      if ($(this.cbCourbe).prop('checked')) {
        app.ajouteCourbeSurR(this.paneListeRep.getSelectedRep(), this.fonc, list.genereNomPourPointOuDroite('x'),
          list.genereNomPourCalcul('x', true), list.genereNomPourCalcul('y', true), nb, true, true, true)
        list.afficheTout(ind, app.svgFigure, true, app.doc.couleurFond)
      }
    }
    app.gestionnaire.enregistreFigureEnCours(this.modification
      ? 'ModifObj'
      : this.bReel ? 'Fonction' : 'FoncComp')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.inputFormula.focus()
}
