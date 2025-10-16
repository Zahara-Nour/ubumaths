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
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import MtgDlg from './MtgDlg'
import ConfirmDlg from './ConfirmDlg'
import NatObj from '../types/NatObj'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
export default ModificationObjNumDlg

/**
 * Boîte de dialogue proposant une liste formé de tous les objets de type calcul
 * dont on peut modifier la formule.
 * Des boutons permettent de modifier, supprimer l'objet.
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param callBackOK Fonction de callBack à appeler après validation par OK.
 * @constructor
 */
function ModificationObjNumDlg (app, callBackOK) {
  let tr, td, btnReclassDeb,
    btnReclassFin
  MtgDlg.call(this, app, 'ModificationObjNumDlg', callBackOK)
  const self = this
  this.inf = this.app.listePr.listeParNatCal(app, NatCal.NTtObjNum, -1)
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  tr = ce('TR')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table', {
    cellspacing: 10
  })
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  this.select = ce('SELECT', {
    size: 12, // Le nombre de lignes visilbles par défaut
    style: 'width:200px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  td = ce('td', {
    style: 'vertical-align:middle;'
  })
  tr.appendChild(td)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  this.updateList(0)

  const tabBoutons = ce('table', {
    cellspacing: 10
  })
  td.appendChild(tabBoutons)
  tr = ce('tr')
  tabBoutons.appendChild(tr)
  const btnModifier = ce('button', {
    tabindex: -1,
    style: 'width:280px'
  })
  this.btnModifier = btnModifier
  btnModifier.onclick = function () { self.onBtnModifier() }
  $(btnModifier).html(getStr('Modifier'))
  tr.appendChild(btnModifier)
  tr = ce('tr')
  tabBoutons.appendChild(tr)
  const btnSupprimer = ce('button', {
    tabindex: -1,
    style: 'width:280px'
  })

  this.btnSupprimer = btnSupprimer
  btnSupprimer.onclick = function () { self.onBtnSupprimer() }
  $(btnSupprimer).html(getStr('Supprimer'))
  tr.appendChild(btnSupprimer)
  if (!this.app.estExercice) {
    tr = ce('tr')
    tabBoutons.appendChild(tr)
    btnReclassDeb = ce('button', {
      tabindex: -1,
      style: 'width:280px'
    })
    this.btnReclassDeb = btnReclassDeb
    btnReclassDeb.onclick = function () {
      self.onBtnReclass(true)
    }
    $(btnReclassDeb).html(getStr('ReclassDebObjGra'))
    tr.appendChild(btnReclassDeb)

    tr = ce('tr')
    tabBoutons.appendChild(tr)
    btnReclassFin = ce('button', {
      tabindex: -1,
      style: 'width:280px'
    })
    this.btnReclassFin = btnReclassFin
    btnReclassFin.onclick = function () {
      self.onBtnReclass(false)
    }
    $(btnReclassFin).html(getStr('ReclassFinObjGra'))
    tr.appendChild(btnReclassFin)
  }

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const label = ce('label')
  $(label).html(getStr('ChoixValeurDlg3'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.textarea = ce('textarea', {
    cols: 50,
    rows: 6,
    disabled: 'true'
  })
  tr.appendChild(this.textarea)

  this.onSelectChange()
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}
  buttons[getStr('Fermer')] = function (ev) {
    self.destroy()
    self.stopEvent(ev)
    self.callBackOK()
  }

  $('#' + self.id).dialog({
    modal: true,
    title: getStr('ObjNum'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.destroy()
      self.stopEvent(ev)
      self.callBackOK()
    },
    width: 570,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

ModificationObjNumDlg.prototype = new MtgDlg()

ModificationObjNumDlg.prototype.getIndex = function (el) {
  for (let i = 0; i < this.inf.noms.length; i++) {
    if (this.inf.pointeurs[i] === el) return i
  }
  return -1
}

ModificationObjNumDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  let ch = el.infoHist()
  if (el.estElementFinal) ch += '\n' + getStr('ObjFin') + ' ' + el.impProto.nomProto
  $(this.textarea).text(ch)
  $(this.btnModifier).css('visibility', el.modifiableParMenu() ? 'visible' : 'hidden')
  $(this.btnSupprimer).css('visibility', el.estDeNatureCalcul(NatCal.NCalculReelConstant) ? 'hidden' : 'visible')
  const reclassable = el.estDeNatureCalcul(NatCal.NTtObjNumSaufConst)
  $(this.btnReclassDeb).css('visibility', reclassable ? 'visible' : 'hidden')
  $(this.btnReclassFin).css('visibility', reclassable ? 'visible' : 'hidden')
  $(this.select).focus()
}

/**
 * Fonction reclassant si c'est possible l'objet en cours vers le début si bdebut est true, vers la fin sinon
 * @param {boolean} bdebut
 */
ModificationObjNumDlg.prototype.onBtnReclass = function (bdebut) {
  const self = this
  const app = this.app
  const list = app.listePr
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  if (bdebut ? list.reclasseVersDebutAvecDependants(el) : list.reclasseVersFinAvecDependants(el)) {
    list.positionneDependantsDe(false, app.dimf, el)
    list.metAJourParNatureObjet(NatObj.NComouLatex) // Pour que les dépendances de commentaires et laTeX dynamiques soient remis à jour
    // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
    list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
    // Réafficher l'élément ne suffit pas car sa place dans le Dom ne chagera pas.
    // Il faut tout réafficher
    app.reCreateDisplay()
    //
    app.gestionnaire.enregistreFigureEnCours(bdebut ? 'ReclassDebObjGra' : 'ReclassFinObjGra')
    new AvertDlg(app, bdebut ? 'AvertRecDeb' : 'AvertRecFin',
      function () {
        self.updateList(el)
      })
  } else new AvertDlg(app, 'AvertRecImp')
}

ModificationObjNumDlg.prototype.onBtnModifier = function () {
  const app = this.app
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  const self = this
  if (el.modifiableParMenu()) {
    el.modifDlg(app, function () { // La fonction utilisée quand l'utilisateur valide la boîte de dialogue
      // app.listePr.metAJour(); // Pour mettre à jour les calculs de dérivées et le lieu d'objets
      // A revoir
      // Il est nécessaire d'appler positionneDependantsDe car par exemple le nombre d'objets d'un lieu
      // d'objets peut avoir été modifié et il faut alors le mettre à jour mais quand on le met à jour
      // sa liste de copies d'objets n'est plus positionnée et pour chacune de ses copies existe est undefined
      const list = app.listePr
      list.initialiseDependances()
      list.positionneDependantsDe(false, app.dimf, el)
      list.metAJourObjetsDependantDe(el)
      // Ligne suivante modifiée version 6.7.6 : Il faut rappeler positionneDependantsDe avec un dernier paramètre à true
      // Pour que ce soit par positionneFull qui soit appelé pour chaque éléement dépendant de el car si, par exemple,
      // un ematrice avait des termes dépendants d'une dérivée partielle qui vient d'être recalculée
      // par metAJourObjetsDependantDe ses termes doivent tous être recalculés
      // list.positionneDependantsDe(false, app.dimf, el) // Il faut rappeler positionneDependantsDe pour par exemple recalculer les dérivées
      list.positionneDependantsDe(false, app.dimf, el, true) // Il faut rappeler positionneDependantsDe pour par exemple recalculer les dérivées
      list.setDependantLatexToBeUpdated(el) // Le deuxième positionnement des CLaTeX dépendant de el a mis leur membre isToBeUpdated
      // à false et il faut le remettre à true pour qu'ils soient réaffichés
      // car ces dérivées n'ont été mises à jour que dans metAJourObjetsDependantDe
      list.updateDependants(el, app.svgFigure, app.doc.couleurFond, true)
      if (el.estDeNatureCalcul(NatCal.NVariable)) el.updateDisplay()
      self.updateList(0)
      self.select.selectedIndex = ind
      self.onSelectChange()
    }, null)
  }
}

ModificationObjNumDlg.prototype.onBtnSupprimer = function () {
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  const app = this.app
  const list = app.listePr
  const self = this
  if (list.nombreDependants(el) >= 2) {
    new ConfirmDlg(app, 'ch37', function () { self.detruitObjet(el) }, function () {})
  } else this.detruitObjet(el)
}

ModificationObjNumDlg.prototype.detruitObjet = function (el) {
  const app = this.app
  const bdlgAss = el.estDeNatureCalcul(NatCal.NVariable) && el.dialogueAssocie
  if (bdlgAss) app.removePaneVariables()
  app.detruitDependants(el)
  if (bdlgAss) app.listePr.creePaneVariables()
  app.gestionnaire.enregistreFigureEnCours('Supprimer')
  this.updateList(this.select.selectedIndex)
  this.onSelectChange()
  app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
}

/**
 * Fonction recréant la liste de gauche en sélectionnant l'élément d'indice indsel ou l'élement indsel
 * @param {number|CElementBase} indsel
 */
ModificationObjNumDlg.prototype.updateList = function (indsel) {
  const self = this
  const liste = this.app.listePr
  empty(this.select)
  this.inf = liste.listeParNatCal(this.app, NatCal.NTtObjNum, -1)
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    option.ondblclick = function () { self.onBtnModifier() }
    this.select.appendChild(option)
  }
  if (!Number.isInteger(indsel)) indsel = this.getIndex(indsel)
  const le = this.select.options.length
  if (indsel >= le) this.select.selectedIndex = le - 1
  else this.select.selectedIndex = indsel
  $(this.select).focus()
}
