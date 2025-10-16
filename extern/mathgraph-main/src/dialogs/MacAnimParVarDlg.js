/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import { getMtgInput } from './dom'
import MacroDlg from './MacroDlg'
import PaneAnimation from './PaneAnimation'
import InfoAnim from '../types/InfoAnim'
import PaneChoixVar from 'src/dialogs/PaneChoixVar'
import $ from 'jquery'

import AvertDlg from './AvertDlg'

export default MacAnimParVarDlg

/**
 * Dialogue de création ou modification d'une macro d'animation par variable
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param bAvecTraces true pour une macro d'apparition avec trace d'objets, false sinon
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacAnimParVarDlg (app, bAvecTraces, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let tr, div, label, cb
  this.bAvecTraces = bAvecTraces
  const self = this
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
  this.paneAnimation = new PaneAnimation(app, modification ? new InfoAnim(mac) : app.pref_Anim, true, true, false, true)
  tabPrincipal.appendChild(this.paneAnimation.container)
  // Ajout du panneau de choix de variable
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneChoixVar = new PaneChoixVar(app, true)
  if (modification) this.paneChoixVar.selectVar(mac.variableAssociee)
  tr.appendChild(this.paneChoixVar.container)
  /// /////////////////////////////////////////////////////////////////////////
  // Deux checkBox pour savoir si l'animation se fait sur un seul cycle //////
  // et si le point lié revient à sa position de départ en fin d'animation  //
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  cb = ce('input', {
    type: 'checkbox',
    id: 'cbuncyc'
  })
  cb.onchange = function () {
    self.onchange()
  }
  div.appendChild(cb)
  if (mac.unCycle) $(cb).attr('checked', 'checked')
  label = ce('label', {
    for: 'cbuncyc'
  })
  $(label).html(getStr('UnCyc') + ' ')
  div.appendChild(label)
  cb = ce('input', {
    type: 'checkbox',
    id: 'cbretfin'
  })
  div.appendChild(cb)
  if (mac.retourDepart) $(cb).attr('checked', 'checked')
  label = ce('label', {
    for: 'cbretfin'
  })
  $(label).html(getStr('RetFinCyc'))
  div.appendChild(label)
  /// ///////////////////////////////////////////////////////////////////////////////////////////////
  // Si la macro est avec traces, un checkBox pour savoir si on efface les traces en fin de cycle //
  if (bAvecTraces) {
    tr = ce('tr', {
      id: 'trtra'
    })
    tabPrincipal.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    cb = ce('input', {
      type: 'checkbox',
      id: 'cbeff'
    })
    div.appendChild(cb)
    if (mac.effacementFinCycle) $(cb).attr('checked', 'checked')
    label = ce('label', {
      for: 'cbeff'
    })
    $(label).html(getStr('EffFinCyc'))
    div.appendChild(label)
  }
  /// /////////////////////////////////////////////////////////////////////////////////////
  // Deux boutons radio pour savoir si l'animation est arrêtée par un clic souris ou si //
  // Elle est de durée donnée, avec un champ d'édition pour la durée.                   //
  tr = ce('tr', {
    id: 'trclic'
  })
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
  tr = ce('tr', {
    id: 'trdur'
  })
  tabPrincipal.appendChild(tr)
  div = ce('div')
  tr.appendChild(div)
  const radio2 = ce('input', {
    type: 'radio',
    id: 'durdon',
    name: 'opanim'
  })
  radio2.onchange = function () {
    self.onradio2change()
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
  this.onchange()
  this.create(bAvecTraces ? 'MacAnimParVarTr' : 'MacAnimParVar', 500)
}

MacAnimParVarDlg.prototype = new MacroDlg()

MacAnimParVarDlg.prototype.OK = function () {
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
      mac.animationCyclique = infoAnim.animCycl
      mac.inverserSens = infoAnim.invSens
      if (this.bAvecTraces) mac.effacementFinCycle = $('#cbeff').prop('checked')
      mac.unCycle = $('#cbuncyc').prop('checked')
      if (mac.unCycle) mac.dureeAnimation = 50
      mac.retourDepart = $('#cbretfin').prop('checked')
      mac.variableAssociee = this.paneChoixVar.getVar()
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    }
  } else this.avertIncorrect()
}

MacAnimParVarDlg.prototype.onchange = function () {
  const b = $('#cbuncyc').prop('checked')
  $('#trtra').css('visibility', b ? 'hidden' : 'visible')
  $('#trclic').css('visibility', b ? 'hidden' : 'visible')
  $('#trdur').css('visibility', b ? 'hidden' : 'visible')
  // $("#inputdur").css("visibility", b ? "hidden" : "visible");
  if (!b) $('#stopclic').attr('checked', 'checked')
  this.onradio2change()
}

MacAnimParVarDlg.prototype.onradio2change = function () {
  const sel = $('#inputdur')
  const b = $('#cbuncyc').prop('checked')
  sel.css('visibility', $('#durdon').prop('checked') && !b ? 'visible' : 'hidden')
  sel.val('50')
}
