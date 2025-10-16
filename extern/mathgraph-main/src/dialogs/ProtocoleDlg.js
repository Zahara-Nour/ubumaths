/*
 * Created by yvesb on 26/05/2017.
 */

import { addImg, ce } from '../kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import constantes from '../kernel/constantes'
import MtgDlg from './MtgDlg'
import CListeObjets from '../objets/CListeObjets'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import { replaceIneg } from '../kernel/kernelAdd'
import $ from 'jquery'
import ConfirmDlg from './ConfirmDlg'
import AvertDlg from '../dialogs/AvertDlg'
import TagDlg from './TagDlg'
import addQueue from 'src/kernel/addQueue'

export default ProtocoleDlg

/**
 * Boîte de dialogue montrant l'historique de tous les objets de la figure.
 * Des boutons permettent de modifier, supprimer, reclasser l'objet.
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param callBackOK Fonction de callBack à appeler après validation par OK.
 * @constructor
 */
function ProtocoleDlg (app, callBackOK) {
  MtgDlg.call(this, app, 'ProtocoleDlg', callBackOK)
  // Modification version 6.3.0. Quand le dialogue est ouvert, on met app.isRunningProtocol à true.
  // Ainis quand on modifie un objet dont le dialogue de modification appelle la sauvegarde de la figure, cette sauvegarde
  // ne sera pas effectuée par l'objet Gestionnaire
  app.isRunningProtocol = true
  const estExercice = app.estExercice
  // this.indPremierObjet représente l'inidce du premier objet à ne pas afficher (dans le cas d'exercice ce n'est pas 0)
  this.indPremierObjet = estExercice ? app.nbObjInit : 0
  this.modified = false // Sera mis à true si l'utilisateur a modifié ou reclassé un objet
  this.interm = false // Sera true si les objets intermédiaires de construction doivent être affichés
  // Le reclassement d'objets peut être lent pour une figure mourde.
  // Il ne faut pas qu'on puisse lancer un reclassement alors qu'un recassement est déjà en cours
  this.isReclassing = false
  const list = this.app.listePr
  // On retire tous les g Elements de la figure pour les recréer ensuite une fois nommés les points non nommés nommés
  list.removegElements(app.svgFigure, false, this.indPremierObjet)
  // On restreint le nombre d'objets à présenter dans la liste aux 4000 premiers objets
  this.indObjMax = Math.min(list.longueur() - 1, constantes.nbObjMaxProto)
  this.infInit = this.listePourHist(this.indObjMax)
  this.listeObjetsNommes = new CListeObjets()
  // list.genereNoms(this.listeObjetsNommes, false);
  list.genereNoms(estExercice ? app.nbObjInit : 0, this.indObjMax, this.listeObjetsNommes)
  // On recrée les élements associés aux objets graphiques
  this.prepareForProtocol(true, false)
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  this.appendChild(tabPrincipal)
  if (!estExercice) {
    // Version 6.7.2 : On ajoute une ligne pour donner le nombre total d'objets
    const tr = ce('tr')
    tabPrincipal.appendChild(tr)
    const lbl = ce('label')
    $(lbl).css('font-size', '12px')
    tr.appendChild(lbl)
    $(lbl).text(list.longueur() + ' ' + getStr('objets'))
  }
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  let td = ce('td')
  tabHaut.appendChild(td)
  this.select = ce('select', {
    size: 12, // Le nombre de lignes visibles
    style: 'width:220px;overflow:auto',
    multiple: 'multiple' // On permet de sélectionner deux objets pour reclasser avant ou après un objet donné
  })
  this.select.onchange = () => {
    this.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  this.updateSelect(0)
  td = ce('td')
  tabHaut.appendChild(td)
  $(td).css('vertical-align', 'top')
  const tabIcones = ce('table')
  // Un tableau pour les icônes permettant de naviguer dans la liste et de reclasser les objets.
  const ar = estExercice
    ? ['upMaxArrow', 'upArrow', 'downArrow', 'downMaxArrow',
        'outilGomme', 'outilRideau']
    : ['upMaxArrow', 'upMax', 'upArrow', 'up', 'downArrow', 'down', 'downMaxArrow', 'downMax',
        'outilSup', 'supEnd', 'outilGomme', 'outilRideau', 'outilModifObjGraph', 'outilPalette']

  const af = estExercice
    ? [this.upMax, this.up, this.down, this.downMax,
        this.hide, this.show]
    : [this.upMax, this.reclassUpMax, this.up, this.reclassUp, this.down, this.reclassDown, this.downMax, this.reclassDownMax,
        this.sup, this.supEnd, this.hide, this.show, this.modify, this.palette]
  td.appendChild(tabIcones)
  for (let j = 0; j < (estExercice ? 6 : 14); j++) {
    if (estExercice && (j < 4)) tr = ce('tr')
    else if (j % 2 === 0) tr = ce('tr')
    tabIcones.appendChild(tr)
    td = ce('td', {
      id: ar[j]
    })
    tr.appendChild(td)
    td.style.padding = '1px'
    addImg(td, ar[j])
    td.onclick = () => af[j].call(this)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const info = ce('textarea', {
    id: 'mtginfo',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  $(info).css('font-size', '13px')
  tr.appendChild(info)
  if (!estExercice) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    let div = ce('div')
    tr.appendChild(div)
    const tabTag = ce('table',
      {
        id: 'tabtag'
      })
    div.appendChild(tabTag)
    tr = ce('tr')
    tabTag.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    let label = ce('label')
    $(label).text(getStr('tag') + ' : ')
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    const tagInput = ce('input', {
      id: 'taginput',
      size: 16,
      disabled: 'true'
    })
    td.appendChild(tagInput)
    tr = ce('tr')
    tabTag.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    td = ce('td')
    tr.appendChild(td)
    const btnTag = ce('button')
    $(btnTag).css('font-size', '13px')
    $(btnTag).html(getStr('changeTag'))
    btnTag.onclick = () => {
      const ind = this.select.selectedIndex
      const el = this.inf.pointeurs[ind]
      new TagDlg(this.app, el, () => {
        $('#taginput').val(el.tag)
        this.modified = true
      })
    }
    td.appendChild(btnTag)
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    const cbinterm = ce('input', {
      id: 'cbinterm',
      type: 'checkbox'
    })
    div.appendChild(cbinterm)
    cbinterm.onclick = () => {
      this.interm = $('#cbinterm').prop('checked')
      this.removegElements(!this.interm)
      this.updateList(!this.interm, 0)
      this.updateDisplay()
    }
    label = ce('label', {
      for: 'cbinterm'
    })
    div.appendChild(label)
    $(label).html(getStr('ObjInterm') + ' (*)')

    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    const cbObjMasVis = ce('input', {
      id: 'cbobjmasvis',
      type: 'checkbox'
    })
    cbObjMasVis.setAttribute('checked', 'checked')
    div.appendChild(cbObjMasVis)
    this.objMasVis = true
    cbObjMasVis.onclick = () => {
      this.objMasVis = $('#cbobjmasvis').prop('checked')
      this.removegElements(this.interm)
      this.prepareForProtocol(this.objMasVis, this.interm)
      this.updateList(this.interm, 0)
      this.updateDisplay()
    }
    label = ce('label', {
      for: 'cbobjmasvis'
    })
    div.appendChild(label)
    $(label).html(getStr('ObjMasVis'))
  }
  // Correction version 6.2.0 : Il faut attendre que tous les g elements soient créés et certains peuvent être créés
  // de façon asynchrone
  addQueue(() => {
    this.onSelectChange()
  })
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}
  buttons[getStr('Fermer')] = (ev) => {
    this.stopEvent(ev)
    this.onClose(ev)
  }

  $('#' + this.id).dialog({
    modal: true,
    title: getStr((list.longueur() > constantes.nbObjMaxProto) ? 'ProtoNbMax' : 'ProtoFig'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: (ev) => {
      this.onClose(ev)
    },
    width: 320,
    closeOnEscape: false,
    // On affiche la boîte de dialogue sur le div parent de l'application en haut et à droite
    position: { my: 'right top', at: 'right top', of: this.app.svg.parentElement }
  })
}

ProtocoleDlg.prototype = new MtgDlg()

/**
 * Fournit le nombre d'items déjà sélectionnés dans la liste.
 * Pour le reclassement avancé, on permet en effet de sélectionner deux items.
 * @returns {number}
 */
ProtocoleDlg.prototype.nbSelectedItems = function () {
  const options = this.select.options
  let res = 0
  for (let i = 0; i < options.length; i++) {
    if ($(options[i]).prop('selected')) res++
  }
  return res
}

/**
 * Fonction renvoyant, dans le cas où deux objets sont sélectionnés, un pointeur sur le premier élément
 * @returns {*|null}
 */
ProtocoleDlg.prototype.firstSelectedElt = function () {
  if (this.nbSelectedItems() !== 2) return null
  const options = this.select.options
  for (let i = 0; i < options.length; i++) {
    if ($(options[i]).prop('selected')) {
      return this.inf.pointeurs[i]
    }
  }
}

/**
 * Fonction renvoyant, dans le cas où deux objets sont sélectionnés, un pointeur sur le deuxlième élément
 * @returns {*|null}
 */
ProtocoleDlg.prototype.lastSelectedElt = function () {
  if (this.nbSelectedItems() !== 2) return null
  const options = this.select.options
  for (let i = options.length - 1; i >= 0; i--) {
    if ($(options[i]).prop('selected')) {
      return this.inf.pointeurs[i]
    }
  }
}

ProtocoleDlg.prototype.selectElt = function (el) {
  this.deselectAll()
  const options = this.select.options
  for (let i = 0; i < options.length; i++) {
    if (this.inf.pointeurs[i] === el) {
      this.select.selectedIndex = i
      break
    }
  }
}

/**
 * Fonction vérifiant qu'il n'y a qu'un seul item de sélectionné et, si non, sélectionne uniquement
 * le premier objet sélectionné
 */
ProtocoleDlg.prototype.resetSelection = function () {
  if (this.nbSelectedItems() >= 2) {
    this.selectElt(this.firstSelectedElt())
  }
}

ProtocoleDlg.prototype.deselectAll = function () {
  const options = this.select.options
  for (let i = 0; i < options.length; i++) {
    $(options[i]).prop('selected', false)
  }
}

ProtocoleDlg.prototype.upMax = function () {
  this.deselectAll() // Au cas où plusieurs éléments seraient sélectionnés
  this.select.selectedIndex = 0
  this.onSelectChange()
}

ProtocoleDlg.prototype.up = function () {
  const ind = this.select.selectedIndex
  if (ind > 0) this.select.selectedIndex--
  this.onSelectChange()
}

ProtocoleDlg.prototype.downMax = function () {
  this.deselectAll() // Au cas où plusieurs éléments seraient sélectionnés
  this.select.selectedIndex = this.select.length - 1
  this.onSelectChange()
}

ProtocoleDlg.prototype.down = function () {
  this.resetSelection() // Au cas où plusieurs éléments seraient sélectionnés
  const ind = this.select.selectedIndex
  if (ind < this.select.length - 1) this.select.selectedIndex++
  this.onSelectChange()
}

ProtocoleDlg.prototype.getIndex = function (el) {
  for (let i = 0; i < this.inf.noms.length; i++) {
    if (this.inf.pointeurs[i] === el) return i
  }
  return -1
}

ProtocoleDlg.prototype.prepareForProtocol = function (objMasquesVisibles, bInterm) {
  const app = this.app
  const list = app.listePr
  const doc = app.doc
  list.prepareForProtocol(app.svgFigure, doc.couleurFond, objMasquesVisibles, bInterm,
    app.estExercice ? app.nbObjInit : 0, this.indObjMax)
}

ProtocoleDlg.prototype.reclassUp = function () {
  if (this.nbSelectedItems() >= 2) {
    new AvertDlg(this.app, 'AvertRecSelMul', () => {
      $(this.select).focus()
    })
    return
  }
  this.resetSelection() // Au cas où plusieurs éléments seraient sélectionnés
  const app = this.app
  const list = app.listePr
  const ind = this.select.selectedIndex
  if (this.isReclassing || (ind === -1)) return // Si on a appuyé sur un bouton alors qu'un reclassement est en cours
  const el = this.inf.pointeurs[ind]
  this.isReclassing = true
  this.removegElements(this.interm)
  if (this.app.listePr.reclassUpOneStep(el)) {
    // Modification version 6.3.0
    // list.metAJourObjetsDependantDe(el);
    list.metAJourParNatureObjet(NatObj.NComouLatex)
    // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
    list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
    this.updateSelect(-1)
    this.select.selectedIndex = this.getIndex(el)
    this.modified = true
  } else new AvertDlg(app, 'AvertRecImp')
  this.prepareForProtocol(this.objMasVis, this.interm)
  this.updateDisplay()
  $(this.select).focus() // Pour les périphériques mobiles
  this.isReclassing = false
}

ProtocoleDlg.prototype.reclassDown = function () {
  if (this.nbSelectedItems() >= 2) {
    new AvertDlg(this.app, 'AvertRecSelMul', () => {
      $(this.select).focus()
    })
    return
  }
  this.resetSelection() // Au cas où plusieurs éléments seraient sélectionnés
  const app = this.app
  const list = app.listePr
  const ind = this.select.selectedIndex
  if (this.isReclassing || (ind === -1)) return // Si on a appuyé sur un bouton alors qu'un reclassement est en cours
  this.isReclassing = true
  if (ind === 0) return // Pas de reclassement pour la constante pi
  const el = this.inf.pointeurs[ind]
  this.removegElements(this.interm)
  if (this.app.listePr.reclassDownOneStep(el)) {
    // Modification version 6.3.0
    // list.metAJourObjetsDependantDe(el);
    list.metAJourParNatureObjet(NatObj.NComouLatex)
    // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
    list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
    this.updateSelect(-1)
    this.select.selectedIndex = this.getIndex(el)
    this.modified = true
  } else new AvertDlg(app, 'AvertRecImp')
  this.prepareForProtocol(this.objMasVis, this.interm)
  this.updateDisplay()
  $(this.select).focus() // Pour les périphériques mobiles
  this.isReclassing = false
}

ProtocoleDlg.prototype.reclassUpMax = function () {
  const app = this.app
  const list = app.listePr
  const ind = this.select.selectedIndex
  if (this.isReclassing || (ind === -1)) return // Si on a appuyé sur un bouton alors qu'un reclassement est en cours
  this.isReclassing = true
  this.removegElements(this.interm)
  if (this.nbSelectedItems() === 1) {
    const el = this.inf.pointeurs[ind]
    if (list.reclasseVersDebutAvecDependants(el)) {
      list.metAJourParNatureObjet(NatObj.NComouLatex)
      // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
      list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
      new AvertDlg(app, 'AvertRecDeb', () => {
        this.updateSelect(el)
        $(this.select).focus()
      })
      this.modified = true
    } else new AvertDlg(app, 'AvertRecImp')
  } else { // Cas où on reclasse un élément après un autre
    const el1 = this.firstSelectedElt()
    const el2 = this.lastSelectedElt()
    if (list.reclasseVersDebutAvant(el2, el1)) {
      list.metAJourParNatureObjet(NatObj.NComouLatex)
      // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
      list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
      new AvertDlg(app, 'AvertRecDeb', () => {
        this.selectElt(el2)
        this.updateSelect(el2)
        $(this.select).focus()
      })
      this.modified = true
    } else {
      new AvertDlg(app, 'AvertRecImp', () => {
        this.selectElt(el2)
        $(this.select).focus()
      })
    }
  }
  this.prepareForProtocol(this.objMasVis, this.interm)
  this.updateDisplay()
  $(this.select).focus() // Pour les périphériques mobiles
  this.isReclassing = false
}

ProtocoleDlg.prototype.reclassDownMax = function () {
  const app = this.app
  const list = app.listePr
  const ind = this.select.selectedIndex
  if (this.isReclassing || (ind === -1)) return // Si on a appuyé sur un bouton alors qu'un reclassement est en cours
  this.isReclassing = true
  this.removegElements(this.interm)
  if (this.nbSelectedItems() === 1) {
    const el = this.inf.pointeurs[ind]
    if (list.reclasseVersFinAvecDependants(el)) {
      list.metAJourParNatureObjet(NatObj.NComouLatex)
      // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
      list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
      new AvertDlg(app, 'AvertRecFin', () => {
        this.updateSelect(el)
        $(this.select).focus()
      })
      this.modified = true
    } else new AvertDlg(app, 'AvertRecImp')
  } else {
    const el1 = this.firstSelectedElt()
    const el2 = this.lastSelectedElt()
    if (list.reclasseVersFinApres(el1, el2)) {
      list.metAJourParNatureObjet(NatObj.NComouLatex)
      // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
      list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
      new AvertDlg(app, 'AvertRecFin', () => {
        this.selectElt(el1)
        this.updateSelect(el1)
        $(this.select).focus()
      })
      this.modified = true
    } else {
      new AvertDlg(app, 'AvertRecImp', () => {
        this.selectElt(el1)
        $(this.select).focus()
      })
    }
  }
  this.prepareForProtocol(this.objMasVis, this.interm)
  this.updateDisplay()
  $(this.select).focus() // Pour les périphériques mobiles
  this.isReclassing = false
}

/**
 * Fonction montrant ou cachant les boutons de reclassemnt d'objet suivant la valeur de bshow
 * @param bshow Si ture on montre les boutons sinon on les cache
 */
ProtocoleDlg.prototype.montreBoutonsRecl = function (bshow) {
  const at = bshow ? 'visible' : 'hidden'
  $('#upMax').css('visibility', at)
  $('#up').css('visibility', at)
  $('#down').css('visibility', at)
  $('#downMax').css('visibility', at)
}

ProtocoleDlg.prototype.detruitObjet = function (el) {
  const app = this.app
  const list = app.listePr
  app.outilProtocole.annuleClignotement()
  const bdlgAss = el.estDeNatureCalcul(NatCal.NVariable) && el.dialogueAssocie
  if (bdlgAss) app.removePaneVariables()
  this.removegElements(this.interm)
  let antecedent = el.antecedentDirect()
  if (antecedent.estDeNature(NatObj.NTransformation) && (antecedent !== el) && list.nombreImagesParTransformationNonDepDe(antecedent, el) > 0) antecedent = el
  app.detruitDependants(antecedent, false) // false car on a déjà détruit les gElements
  if (bdlgAss) app.listePr.creePaneVariables()
  this.updateList(this.interm, this.select.selectedIndex)
  this.updateDisplay()
  this.onSelectChange()
  this.modified = true
}

ProtocoleDlg.prototype.sup = function () {
  if (this.nbSelectedItems() >= 2) {
    new AvertDlg(this.app, 'AvertRecSelMul', () => {
      $(this.select).focus()
    })
    return
  }
  const ind = this.select.selectedIndex
  if (ind !== -1) {
    const el = this.inf.pointeurs[ind]
    const app = this.app
    const list = app.listePr
    if (list.nombreDependants(el) >= 2) {
      new ConfirmDlg(app, 'ch37', () => {
        this.detruitObjet(el)
      }, function () {
      })
    } else this.detruitObjet(el)
  }
}

ProtocoleDlg.prototype.supEnd = function () {
  if (this.nbSelectedItems() >= 2) {
    new AvertDlg(this.app, 'AvertRecSelMul', () => {
      $(this.select).focus()
    })
    return
  }
  const app = this.app
  app.outilProtocole.annuleClignotement()
  const ind = this.select.selectedIndex
  if (ind !== -1) {
    const el = this.inf.pointeurs[ind].antecedentDirect()
    const list = app.listePr
    this.removegElements(this.interm)
    const indel = el.index
    const nb = list.longueur() - indel
    for (let i = 0; i < nb; i++) app.detruitDernierElement()
    this.updateList(this.interm, this.select.selectedIndex - 1)
    this.updateDisplay()
    this.onSelectChange()
    this.modified = true
  }
}

ProtocoleDlg.prototype.show = function () {
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  el.masque = false
  this.modified = true
  this.onSelectChange()
}

ProtocoleDlg.prototype.hide = function () {
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  el.masque = true
  this.modified = true
  this.onSelectChange()
}
// Quand modify est appelé, this est le bouton de modification
ProtocoleDlg.prototype.modify = function () {
  this.modif()
  $(this.select).focus()
}

ProtocoleDlg.prototype.palette = function () {
  const app = this.app
  const ind = this.select.selectedIndex
  const listePr = app.listePr
  const el = this.inf.pointeurs[ind]
  this.app.outilPalette.traiteObjetDesigne(el, null, true)
  this.removegElements(this.interm)
  listePr.metAJourObjetsDependantDe(el) // Pour mettre à jour les calculs de dérivées et les lieux d'objets
  listePr.positionneDependantsDe(false, app.dimf, el, true) // Version 6.4.1 : Ajout de full = true
  this.updateList(this.interm, this.select.selectedIndex)
  this.modified = true
  this.onSelectChange() // onSelectChange appelle updateDisplay
}

ProtocoleDlg.prototype.modif = function () {
  const app = this.app
  const listePr = app.listePr
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  const ant = el.antecedentDirect()
  if (ant.estDeNature(NatObj.NTransformation)) {
    ant.modificationImageForProtocol(app, el, () => { // La fonction utilisée quand l'utilisateur valide la boîte de dialogue
      this.removegElements(this.interm)
      listePr.metAJourObjetsDependantDe(el.transformation) // Pour mettre à jour les calculs de dérivées et les lieux d'objets Modifié version 6.4.1
      listePr.positionneDependantsDe(false, app.dimf, el.transformation, true) // Version 6.4.1 : Ajout de full = true et el.transformation
      this.updateList(this.interm, this.select.selectedIndex)
      this.onSelectChange()
      this.modified = true
    },
    () => {
      $(this.select).focus()
    })
  } else {
    el.modifDlg(app, () => { // La fonction utilisée quand l'utilisateur valide la boîte de dialogue
      this.removegElements(this.interm)
      listePr.metAJourObjetsDependantDe(el) // Pour mettre à jour les calculs de dérivées et les lieux d'objets
      listePr.positionneDependantsDe(false, app.dimf, el, true) // Version 6.4.1 : Ajout de full = true
      this.updateList(this.interm, this.select.selectedIndex)
      this.onSelectChange() // onSelectChange appelle updateDisplay
      this.modified = true
      if (el.estDeNatureCalcul(NatCal.NVariable)) el.updateDisplay() // Pour mettre à jour un éventuel dialogue associé à une variable
    },
    () => {
      $(this.select).focus()
    }
    )
  }
}

ProtocoleDlg.prototype.onClose = function (ev) {
  const app = this.app
  const list = app.listePr
  // var inf = this.inf;
  app.isRunningProtocol = false // Ajout version 6.3.0
  const op = app.outilProtocole
  op.annuleClignotement()
  list.removegElements(app.svgFigure, this.interm, 0, this.indObjMax)
  // On redonne aux objets leur statut masque ou non qui a été mémorisé
  this.retablitMasquageObjs()
  list.positionne(false, app.dimf)
  this.destroy()
  this.stopEvent(ev)
  this.listeObjetsNommes.effaceNoms(this.app.pref_TaillePoliceNom)
  list.afficheTout(0, app.svgFigure, true, app.doc.couleurFond, true)
  if (this.modified) app.gestionnaire.enregistreFigureEnCours('Modifier')
  this.callBackOK()
}

ProtocoleDlg.prototype.retablitMasquageObjs = function () {
  const inf = this.infInit
  for (let i = 0; i < inf.noms.length; i++) {
    const el = inf.pointeurs[i]
    if (el.estDeNature(NatObj.NTtObj)) {
      // el.masque = inf.maskstate[i];
      if (el.estDeNature(NatObj.NObjNommable)) el.nomMasque = inf.namemaskstate[i]
    }
  }
}

ProtocoleDlg.prototype.onSelectChange = function () {
  const nbsel = this.nbSelectedItems()
  if (nbsel === 2) return
  if (nbsel >= 3) {
    const ind = this.select.selectedIndex
    this.deselectAll()
    this.select.selectedIndex = ind
  }
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#tabtag').css('display', el.estElementIntermediaire() || !el.estDeNature(NatObj.NTtObj) ? 'none' : 'block')
  $('#taginput').val(el.tag)
  this.montreBoutonsRecl(!el.estElementIntermediaire() && !el.estDeNature(NatObj.NImpProto))
  // var initialMaskedState = this.inf.maskstate[ind];
  if (el.estDeNature(NatObj.NTtObj)) {
    $('#outilGomme').css('visibility', el.masque ? 'hidden' : 'visible')
    $('#outilRideau').css('visibility', el.masque ? 'visible' : 'hidden')
    $('#outilPalette').css('visibility', 'visible')
  } else {
    $('#outilGomme').css('visibility', 'hidden')
    $('#outilRideau').css('visibility', 'hidden')
    $('#outilPalette').css('visibility', 'hidden')
  }
  $('#supEnd').css('visibility', (el.antecedentDirect() === el) && (ind !== 0) ? 'visible' : 'hidden')
  if (!this.app.estExercice) {
    $('#outilModifObjGraph').css('visibility', el.modifiableParProtocole() ? 'visible' : 'hidden')
    $('#outilSup').css('visibility', el.className !== 'CCalcConst' ? 'visible' : 'hidden') // Pas permis de détruire la constante pi
  }
  let ch = el.infoHist()
  if (el.estElementIntermediaire()) ch = '*' + ch
  if (el.estDeNature(NatObj.NTtObj)) {
    if (!el.existe) ch += '\n' + getStr('ch18')
    if (el.masque) ch += '\n' + getStr('ObjMas')
  }
  if (el.estElementFinal) ch += '\n' + getStr('ObjFin') + ' ' + el.impProto.nomProto
  else if (el.estElementIntermediaire()) {
    ch += '\n' + getStr('ObjInter')
  }
  ch += '\nN°html : ' + el.index
  $('#mtginfo').text(ch)
  this.updateDisplay()
  // $(this.select).focus() Non car sur iPad ça ouvre une boîte de dialogue de sélection d'items
}

ProtocoleDlg.prototype.removegElements = function (interm) {
  const app = this.app
  const list = app.listePr
  list.removegElements(app.svgFigure, interm, this.indPremierObjet, this.indObjMax)
}

ProtocoleDlg.prototype.updateDisplay = function () {
  const list = this.app.listePr
  const app = this.app
  const op = app.outilProtocole
  let ind = this.select.selectedIndex
  if (ind === -1) {
    ind = this.select.length - 1
    this.select.selectedIndex = ind
  }
  const el = this.inf.pointeurs[ind]
  // Version 6.4.1 : La suite doit être dans la pile d'appels MathJax car les éléments affichés ne sont peut-être pas encore prêts
  addQueue(() => {
    op.annuleClignotement()
    list.displayForProtocol(this.indPremierObjet, el.index, this.objMasVis, this.interm, this.indObjMax)
    op.ajouteClignotementDe(el)
    // Le deuxième paramètre ci-dessous ne sert que pour les objets images par une transformation et que pour les
    // translations par point origine et extrémité
    el.ajouteAntecedents(app.listeClignotante, app)
    op.resetClignotement()
  })
}

ProtocoleDlg.prototype.listePourHist = function (nbObj) {
  const app = this.app
  const list = app.listePr
  return list.listePourHist(app.estExercice ? app.nbObjInit : 0, this.interm, nbObj)
}

ProtocoleDlg.prototype.updateList = function (bInterm, indSelect) {
  const app = this.app
  const list = app.listePr
  this.retablitMasquageObjs()
  // this.listeObjetsNommes.effaceNoms(this.app.pref_TaillePoliceNom);
  // this.listeObjetsNommes = new CListeObjets();
  // list.genereNoms(this.listeObjetsNommes, this.interm);
  // On recrée les gElements associés aux objets graphiques
  const doc = app.doc
  // On restreint le nombre d'objets à présenter dans la liste aux 2000 premiers objest
  this.indObjMax = Math.min(list.longueur() - 1, constantes.nbObjMaxProto)
  this.inf = this.listePourHist(this.indObjMax)
  list.prepareForProtocol(app.svgFigure, doc.couleurFond, true, this.interm,
    app.estExercice ? app.nbObjInit : 0, this.indObjMax)
  this.updateSelect(indSelect)
}

/**
 * Fonction remettant à jour la liste de gauche et sélectionnant l'élement d'indice indsel ou l'élément indsel
 * @param {number|CElementBase} indsel
 */
ProtocoleDlg.prototype.updateSelect = function (indsel) {
  let i
  this.inf = this.listePourHist(this.indObjMax)
  for (i = this.select.options.length - 1; i >= 0; i--) this.select.remove(i)
  for (i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === indsel) option.setAttribute('selected', 'selected')
    const el = this.inf.pointeurs[i]
    let ch = this.inf.noms[i]
    if (el.estElementIntermediaire()) ch = '*' + ch
    $(option).html(replaceIneg(ch)) // Le replaceIneg pour que les caractères < et > soient bien rendus
    this.select.appendChild(option)
    option.ondblclick = () => {
      const e = this.inf.pointeurs[this.select.selectedIndex]
      if (e.modifiableParProtocole()) this.modif()
    }
  }
  if (!Number.isInteger(indsel)) indsel = this.getIndex(indsel)
  const le = this.select.options.length
  if (indsel >= le) this.select.selectedIndex = le - 1
  else this.select.selectedIndex = indsel
  $(this.select).focus()
}
