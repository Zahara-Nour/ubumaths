/*
 * Created by yvesb on 12/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import NatCal from '../types/NatCal'
import PaneNombreDecimales from './PaneNombreDecimales'
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import MtgInputWithCharSpe from './MtgInputWithCharSpe'
import CValeurAffichee from '../objets/CValeurAffichee'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import addQueue from 'src/kernel/addQueue'

export default AffichageValeurDlg

/**
 * Dialogue servant à créer ou modifier un affichage de valeur
 * @param {MtgApp} app L'application propriétaire
 * @param valAff L'affichage de valeur à modifier
 * @param modification true si on modifie un affichage de valeur déjà créé
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annulation
 * @constructor
 * @extends MtgDlg
 */
function AffichageValeurDlg (app, valAff, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'affvaldlg', callBackOK, callBackCancel)
  this.valAff = valAff
  const list = app.listePr
  const estFinal = valAff.estElementFinal
  this.modification = modification
  const self = this
  const indmax = modification ? list.indexOf(valAff) - 1 : list.longueur() - 1
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // La première ligne du tableau contient un tableau formé de trois colonnes : Le label, l'éditeur de nom de la valeur
  // et en troisième colonne un tableau de choix de nombre de décimales
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  const trHaut = ce('tr')
  tabHaut.appendChild(trHaut)
  let td = ce('td')
  trHaut.appendChild(td)
  let caption
  if (!(this.modification && valAff.valeurAssociee.estElementIntermediaire())) {
    caption = ce('caption', {
      class: 'mtgcaption'
    })
    $(caption).html(getStr('Valeur'))
    td.appendChild(caption)
    // En haut et à gauche un tableau contenant le label, l'éditeur de nom et dessous le bouton Valeurs
    const tabHautGauche = ce('table')
    td.appendChild(tabHautGauche)
    tr = ce('tr')
    tabHautGauche.appendChild(tr)
    this.inf = list.listeParNatCal(app, NatCal.NTteValROuC, indmax)
    this.select = ce('select', {
      size: 8, // Le nombre de lignes visibles par défaut
      style: 'width:180px'
    })
    this.select.onchange = function () {
      self.updatePreview()
    }
    td.appendChild(this.select)
    if (estFinal) $(this.select).attr('disabled', true)
    // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
    for (let i = 0; i < this.inf.noms.length; i++) {
      const option = ce('Option', {
        class: 'mtgOption'
      })
      if (modification ? (this.inf.pointeurs[i] === valAff.valeurAssociee) : i === 0) option.setAttribute('selected', 'selected')
      $(option).html(this.inf.noms[i])
      this.select.appendChild(option)
    }
  }

  td = ce('td')
  trHaut.appendChild(td)
  this.paneNbDec = new PaneNombreDecimales(valAff.nombreDecimales, function () { self.updatePreview() })
  td.appendChild(this.paneNbDec.container)

  // Un tableau central pour contenir les deux éditeurs de pré et post chaines
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tabCentre.appendChild(td)
  const tabCentreGauche = ce('table')
  td.appendChild(tabCentreGauche)
  tr = ce('tr')
  tabCentreGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('EnTete'))
  td = ce('td')
  tr.appendChild(td)
  /*
  var input = ce("input", {
    type : "text",
    id : "entete",
  });
  */
  let input = new MtgInputWithCharSpe(app, { id: 'entete' }, ['grec', 'math', 'arrows'], false, this)
  td.appendChild(input)
  input.onkeyup = function () {
    self.updatePreview()
  }

  tr = ce('tr')
  tabCentreGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('SuiviDe'))
  td = ce('td')
  tr.appendChild(td)
  /*
  input = ce("input", {
    type : "text",
    id : "suivide",
  });
  */
  input = new MtgInputWithCharSpe(app, { id: 'suivide' }, ['grec', 'math', 'arrows'], false, this)
  td.appendChild(input)
  input.onkeyup = function () {
    self.updatePreview()
  }

  // Au centre à droite un svg d'aperçu
  td = ce('td')
  tabCentre.appendChild(td)
  const tabCentreDroit = ce('table')
  td.appendChild(tabCentreDroit)
  caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('Apercu'))
  tabCentreDroit.appendChild(caption)
  td = ce('td')
  $(td).css('border', '1px solid lightgray')
  tabCentreDroit.appendChild(td)
  this.svg = cens('svg', {
    width: '200px',
    height: '80px'
  })
  td.appendChild(this.svg)
  // Depuis le 18/3/2025 on impose la fonte 'Roboto' sur tous les conteneurs de svg mtg32
  td.style.fontFamily = 'Roboto'
  // Dans la troisième ligne du tableau principal, un tableau de trois colonnes contenant un panneau de choix de
  // mode d'affichage, un panneau de choix d'alignement et un manneua de choix de taille de police
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, valAff.alignementHorizontal, valAff.alignementVertical)
  const tableBas = ce('table')
  tr.appendChild(tableBas)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(valAff.taillePolice, function () { self.updatePreview() })
  tableBas.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  // Pas d'édition de l'angle d'affichage si c'est un objet final de macro.
  this.paneModeAffichage = new PaneModeAffichage(this, false, valAff.effacementFond, valAff.encadrement,
    valAff.couleurFond, estFinal ? null : valAff.angText.chaineInfo(), indmax, function () { self.updatePreview() })
  td.appendChild(this.paneModeAffichage.container)
  if (modification) {
    $(this.inputVal).val(valAff.valeurAssociee.getNom())
    $('#entete').val(valAff.enTete)
    $('#suivide').val(valAff.postChaine)
  }

  this.create('AffVal', 580)
}

AffichageValeurDlg.prototype = new MtgDlg()

AffichageValeurDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  this.paneModeAffichage.init()
  this.updatePreview()
}

AffichageValeurDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const app = this.app
  const val = this.valAff
  const pma = this.paneModeAffichage
  if (!pma.validate()) {
    return
  } // Faute dans l'angle de rotation du texte
  val.encadrement = pma.getStyleEnc()
  val.effacementFond = pma.getEffFond()
  val.couleurFond = pma.getColor()
  val.nombreDecimales = this.paneNbDec.getDigits()
  // Si l'alignement vertical ou horizontal est changé on annule tout décalage manuel précédent
  const newHorAlign = this.paneAlign.getHorAlign()
  const newVerAlign = this.paneAlign.getVerAlign()
  if ((val.alignementHorizontal !== newHorAlign) || (val.alignementVertical !== newVerAlign)) {
    val.decX = 0
    val.decY = 0
  }
  if (!val.estElementFinal && !(this.modification && val.valeurAssociee.estElementIntermediaire())) {
    val.valeurAssociee = this.inf.pointeurs[this.select.selectedIndex]
    val.angText = pma.getAng()
  }
  //
  val.alignementHorizontal = newHorAlign
  val.alignementVertical = newVerAlign
  val.taillePolice = this.paneTaillePolice.getTaille()
  val.enTete = $('#entete').val()
  val.postChaine = $('#suivide').val()
  val.positionne(false, app.dimf)
  // Finalement il faut recréer l'affichage si, par exemple, on a choisi d'effacer le fond alors qu'il ne l'était pas
  val.setReady4MathJax()
  if (this.modification && this.app.dlg[0] !== 'ProtocoleDlg') {
    addQueue(function () {
      val.reCreateDisplay(app.svgFigure)
    })
  }
  if (this.callBackOK !== null) this.callBackOK()
  if (this.modification) app.gestionnaire.enregistreFigureEnCours('ModifObj')
  this.destroy()
}

/**
 * Met à jour l'aperçu
 * @returns {void}
 */
AffichageValeurDlg.prototype.updatePreview = function updatePreview () {
  const app = this.app
  const list = app.listePr
  const valAff = this.valAff.valeurAssociee
  const pointeur = (this.modification && valAff.estElementIntermediaire()) ? valAff : this.inf.pointeurs[this.select.selectedIndex]

  const pma = this.paneModeAffichage
  const affv = new CValeurAffichee(list, null, false, this.valAff.couleur, 0, 0, 0, 0, false, null,
    this.paneTaillePolice.getTaille(), pma.getStyleEnc(), pma.getEffFond(),
    pma.getColor(), CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop,
    pointeur, $('#entete').val(), $('#suivide').val(), this.paneNbDec.getDigits())
  affv.positionneFull(false, app.dimf)
  if (affv.existe) {
    affv.setReady4MathJax()
    const self = this
    addQueue(function () {
      while (self.svg.childNodes.length !== 0) self.svg.removeChild(self.svg.childNodes[0])
      const g = affv.createg()
      if (affv.encadrement !== StyleEncadrement.Sans) $(g).attr('transform', 'translate(2,2)')
      self.svg.appendChild(g)
    })
  } else {
    while (this.svg.childNodes.length !== 0) this.svg.removeChild(this.svg.childNodes[0])
  }
}
