/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MacroDlg from './MacroDlg'
import PaneFreq from './PaneFreq'
import PaneChoixVar from './PaneChoixVar'
import $ from 'jquery'

export default MacTraceAutoVaDlg

/**
 * Dialogue de création ou modification d'une macro de trace automatique d'objets par variable
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacTraceAutoVaDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé /////////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Au centre un tableau avec à gauche le choix de la variable et à droite le choix de la fréquence  //
  const tabCentre = ce('tab', {
    cellspacing: 2
  })
  tabPrincipal.appendChild(tabCentre)
  const tr = ce('tr')
  tabCentre.appendChild(tr)
  const td = ce('td')
  tr.appendChild(td)
  // Ajout du pane de choix de la variable qui un tab
  this.paneChoixVar = new PaneChoixVar(app, false)
  td.appendChild(this.paneChoixVar.container)
  // Ajout du panneau de choix de fréquence qui est un td /////////
  this.paneFreq = new PaneFreq(mac.frequenceAnimationMacro, true)
  tr.appendChild(this.paneFreq.container)
  /// ////////////////////////////////////////////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacTraceAutoVa', 500)
}

MacTraceAutoVaDlg.prototype = new MacroDlg()

MacTraceAutoVaDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const mac = this.mac
  const ch = $('#inputint').val()
  if (ch !== '') {
    mac.intitule = ch
    mac.frequenceAnimationMacro = this.paneFreq.getFreq()
    mac.variableAssociee = this.paneChoixVar.getVar()
    this.saveBasic()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
