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

export default MacJouantSonDlg

/**
 * Dialogue de création ou modification d'une macro jouant un fichier sonore
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param {boolean} modification  true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacJouantSonDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // On ajoute bouton de navigation pour le choix du fichier   /////
  /// ///////////////////////////////////////////////////////////////
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const label = ce('label')
  $(label).html(getStr('Path') + ' ')
  div.appendChild(label)
  const input = ce('input', {
    id: 'mtginput',
    type: 'text'
  })
  div.appendChild(input)
  /*
  label = ce("label", {
    for : "file"
  });
  */
  if (modification) $(input).val(mac.wavePath)
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacJouantSon', 500)
}

MacJouantSonDlg.prototype = new MacroDlg()

MacJouantSonDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const mac = this.mac
  const ch = $('#inputint').val()
  if (ch !== '') {
    mac.intitule = ch
    mac.wavePath = $('#mtginput').val()
    this.saveBasic()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
