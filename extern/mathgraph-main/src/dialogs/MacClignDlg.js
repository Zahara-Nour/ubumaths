/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import { getMtgInput } from './dom'
import $ from 'jquery'

import AvertDlg from './AvertDlg'

export default MacClignDlg

/**
 * Dialogue de création ou modification d'une macro de clignotement d'objets
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param {boolean} modification  true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacClignDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let tr, div, label
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// /////////////////////////////////////////////////////////////////////////////////////
  // Deux boutons radio pour savoir si l'animation est arrêtée par un clic souris ou si //
  // Elle est de durée donnée, avec un champ d'édition pour la durée.                   //
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const radio1 = ce('input', {
    type: 'radio',
    id: 'stopclic',
    name: 'opanim'
  })
  radio1.onchange = function () {
    $('#inputdur').css('visibility', $('#stopclic').prop('checked') ? 'hidden' : 'visible')
  }
  div.appendChild(radio1)
  label = ce('label', {
    for: 'stopclic'
  })
  $(label).html(getStr('StopClic'))
  div.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const radio2 = ce('input', {
    type: 'radio',
    id: 'durdon',
    name: 'opanim'
  })
  radio2.onchange = function () {
    const sel = $('#inputdur')
    sel.css('visibility', $('#durdon').prop('checked') ? 'visible' : 'hidden')
    if (mac.dureeAnimation === 0) sel.val('50')
  }
  div.appendChild(radio2)
  label = ce('label', {
    for: 'durdon'
  })
  $(label).html(getStr('DureeDon'))
  div.appendChild(label)
  this.inputDur = getMtgInput({
    id: 'inputdur',
    size: 6
  })
  div.appendChild(this.inputDur)
  if (mac.dureeAnimation === 0) {
    radio1.setAttribute('checked', 'checked')
    $('#inputdur').css('visibility', 'hidden')
  } else {
    radio2.setAttribute('checked', 'checked')
    $('#inputdur').val(mac.dureeAnimation)
  }
  this.inputDur.onkeyup = function () {
    this.demarquePourErreur()
  }
  /// ///////////////////////////////////////////////////////////////
  // En bas, ajout d'un tableau de trois colonnes contenant un
  // panneau de choix de mode d'alignement et un panneau de choix
  // de taille de police
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacClign', 480)
}

MacClignDlg.prototype = new MacroDlg()

MacClignDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const mac = this.mac
  const self = this
  if ($('#inputint').val() !== '') {
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
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
