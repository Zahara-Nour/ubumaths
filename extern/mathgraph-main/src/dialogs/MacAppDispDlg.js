/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import $ from 'jquery'

export default MacroAppDisDlg

/**
 * Dialogue de création ou modification d'une macro d'apparition d'objets
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param bApparition true pour une macro d'apparition, false pour une macro de disparition
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacroAppDisDlg (app, bApparition, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let tr, div, label, cb
  this.bApparition = bApparition
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// /////////////////////////////////////////////////////////////
  // Ajout du checkBox pour clic pour objet suivant //////////////
  if (bApparition) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    label = ce('label')
    $(label).html(getStr('ClicSuiv'))
    div.appendChild(label)
    cb = ce('input', {
      type: 'checkbox',
      id: 'cb'
    })
    div.appendChild(cb)
    if (mac.clicPourObjetSuivant) $(cb).attr('checked', 'checked')
    label = ce('label', {
      for: 'cb'
    })
    $(label).html(getStr('ClickSuiv'))
    div.appendChild(label)
  }
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // En bas, ajout d'un tableau de trois colonnes contenant un
  // panneau de choix de mode d'alignement et un panneau de choix
  // de taille de police
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create(bApparition ? 'MacApp' : 'MacDisp', 480)
}

MacroAppDisDlg.prototype = new MacroDlg()

MacroAppDisDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  if ($('#inputint').val() !== '') {
    this.saveBasic()
    if (this.bApparition) this.mac.clicPourObjetSuivant = $('#cb').prop('checked')
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
