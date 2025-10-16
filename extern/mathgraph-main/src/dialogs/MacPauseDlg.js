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

export default MacPauseDlg

/**
 * Dialogue de création ou modification d'une macro de pause
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param {boolean} modification  true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacPauseDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // On ajoute un liste des durées permises en secondes  ///////////
  /// ///////////////////////////////////////////////////////////////
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const td = ce('td')
  tr.appendChild(td)
  $(td).css('vertical-align', 'top')
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:180px'
  })
  td.appendChild(caption)
  $(caption).html(getStr('Durs'))
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visilbles par défaut
    style: 'width:180px'
  })
  td.appendChild(this.select)
  for (let i = 0; i < 31; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html((i === 0) ? getStr('Jusqclic') : i)
    if (i === mac.dureePause) $(option).attr('selected', 'selected')
    this.select.appendChild(option)
  }
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacPause', 450)
}

MacPauseDlg.prototype = new MacroDlg()

MacPauseDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const mac = this.mac
  const ch = $('#inputint').val()
  if (ch !== '') {
    mac.intitule = ch
    mac.dureePause = this.select.selectedIndex
    this.saveBasic()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
