/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MacroDlg from './MacroDlg'
import PaneAnimation from './PaneAnimation'
import InfoAnim from '../types/InfoAnim'
import $ from 'jquery'

import AvertDlg from './AvertDlg'

export default MacTraceAutoDlg

/**
 * Dialogue de création ou modification d'une macro de trace automatique d'objets
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacTraceAutoDlg (app, mac, modification, callBackOK, callBackCancel) {
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
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane pour options de transition et fréquence /////////
  this.paneAnimation = new PaneAnimation(app, new InfoAnim(mac.nombrePointsPourTrace,
    mac.frequenceAnimationMacro, false, false), false, false, true)
  tabPrincipal.appendChild(this.paneAnimation.container)
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacTraceAuto', 500)
}

MacTraceAutoDlg.prototype = new MacroDlg()

MacTraceAutoDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const mac = this.mac
  const self = this
  if ($('#inputint').val() !== '') {
    if (this.paneAnimation.getinfoAnim()) {
      if (!$('#stopclic').prop('checked')) {
        const dur = $(this.inputDur).val()
        const duree = parseInt(dur)
        if ((dur === '') || (duree < 0) || (duree > 3000)) {
          new AvertDlg(this.app, 'Incorrect', function () {
            self.inputDur.marquePourErreur()
            self.inputDur.focus()
          })
          return
        } else mac.dureeAnimation = duree
      } else mac.dureeAnimation = 0
      this.saveBasic()
      const infoAnim = this.paneAnimation.infoAnim
      mac.nombrePointsPourAnimation = infoAnim.nbPts
      mac.frequenceAnimationMacro = infoAnim.freq
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    }
  } else this.avertIncorrect()
}
