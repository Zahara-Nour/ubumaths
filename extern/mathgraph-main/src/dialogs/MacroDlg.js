/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import MtgInputWithCharSpe from './MtgInputWithCharSpe'
import $ from 'jquery'
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import AvertDlg from './AvertDlg'

export default MacroDlg

/**
 * Ancêtre des boîtes de dialogue de création ou modification de macro
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacroDlg (app, mac, modification, callBackOK, callBackCancel) {
  if (arguments.length === 0) return
  MtgDlg.call(this, app, 'macrodlg', callBackOK, callBackCancel)
  this.mac = mac
  this.modification = modification
}

MacroDlg.prototype = new MtgDlg()

/**
 * Fonction ajout en haut de la boîte de dialogue le champ d'édition de l'intitulé
 * @param tab le tableau principal qui contient tous les composants de la boîte de dialogue
 */
MacroDlg.prototype.addEditInt = function (tab) {
  const self = this
  const tr = ce('tr')
  tab.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const label = ce('label')
  div.appendChild(label)
  $(label).html(getStr('Intitule'))
  this.inputInt = new MtgInputWithCharSpe(this.app, { id: 'inputint' }, ['grec', 'math', 'arrows'], false, this)
  this.inputInt.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  div.appendChild(this.inputInt)
}

MacroDlg.prototype.addPaneInfo = function (tab, bmini = false) {
  const tr = ce('tr')
  tab.appendChild(tr)
  const td = ce('td')
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:80px'
  })
  $(caption).html(getStr('Info') + ' :')
  td.appendChild(caption)
  tr.appendChild(td)
  const info = ce('textarea', {
    id: 'info',
    cols: 60,
    rows: bmini ? 1 : 3
  })
  $(info).css('font-size', '13px')
  td.appendChild(info)
  if (this.modification) $(info).val(this.mac.commentaireMacro)
}

/**
 * Fonction rajoutant en bas de la boîte de dialogue trois colonnes pour le choix
 * de style d'alignement, de taille de police et de mode d'affichage et mettant
 * dans le champ d'édition d'intitulé et dans le champ de commentaire les données de la
 * macro dans le cas d'une modification de macro.
 * @param tab
 */
MacroDlg.prototype.addPaneBas = function (tab) {
  // En bas, un tableau de trois colonnes contenant un panneau de choix de
  // mode d'alignement et un panneau de choix de taille de police
  const app = this.app
  const mac = this.mac
  const tr = ce('tr')
  tab.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, mac.alignementHorizontal, mac.alignementVertical)
  const tableBas = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(tableBas)
  let td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(mac.taillePolice)
  tableBas.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneModeAffichage = new PaneModeAffichage(this, true, mac.effacementFond, mac.encadrement, mac.couleurFond)
  td.appendChild(this.paneModeAffichage.container)

  if (this.modification) {
    $(this.inputInt).val(mac.intitule)
    $(this.textarea).val(mac.commentaireMacro)
  }
}

/**
 * Fonction appelée pour les macros qui ne nécessitent que l'en-tête, le pane d'info et les options d'affichage
 */
MacroDlg.prototype.addTabPrincipal = function () {
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)

  /// ///////////////////////////////////////////////////////////////
  // En bas, ajout d'un tableau de trois colonnes contenant un
  // panneau de choix de mode d'alignement et un panneau de choix
  // de taille de police
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
}

/**
 * Fonction ne servant que pour les macros qui ne nécessitent que l'en-tête, le pane d'info et les options d'affichage
 * @constructor
 */
MacroDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  if ($('#inputint').val() !== '') {
    this.saveBasic()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}

/**
 * Fonction mettant à jour les membres de this.mac communs à toutes les macros
 * et mettant àjour l'affichage de l'intitulé en cas de modification
 */
MacroDlg.prototype.saveBasic = function saveBasic () {
  const mac = this.mac
  mac.intitule = $(this.inputInt).val()
  mac.commentaireMacro = $('#info').val()
  mac.alignementHorizontal = this.paneAlign.getHorAlign()
  mac.alignementVertical = this.paneAlign.getVerAlign()
  mac.taillePolice = this.paneTaillePolice.getTaille()
  const pma = this.paneModeAffichage
  mac.effacementFond = pma.getEffFond()
  mac.couleurFond = pma.getColor()
}

MacroDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'inputint')
  this.paneModeAffichage.init()
}

/**
 * Fonction appelée lorsque le contenu de l'intitulé est incorrect et affichant un message d'erreur
 */
MacroDlg.prototype.avertIncorrect = function () {
  const self = this
  new AvertDlg(this.app, 'Incorrect', function () {
    self.inputInt.marquePourErreur()
    self.inputInt.focus()
  })
}
