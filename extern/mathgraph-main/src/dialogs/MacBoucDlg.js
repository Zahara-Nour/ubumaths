/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import PaneChoixVar from './PaneChoixVar'
import PaneFreq from './PaneFreq'
import ListeMacros from './ListeMacros'
import $ from 'jquery'

export default MacBoucDlg

/**
 * Dialogue de création ou modification d'une macro de boucle
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacBoucDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let tr; let td; let caption
  const list = app.listePr
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
  // Ajout du checkBox Animation visible
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const cb = ce('input', {
    type: 'checkBox',
    id: 'cb'
  })
  div.appendChild(cb)
  cb.onclick = function () {
    $(self.paneFreq.container).css('visibility', $('#cb').prop('checked') ? 'visible' : 'hidden')
  }
  const label = ce('label', {
    for: 'cb'
  })
  $(label).html(getStr('AnimVis'))
  div.appendChild(label)
  /// ////////////////////////////////////////////////////////////////////////////
  // Au centre un panneau de 2 colonnes : A gauche, liste de choix de variable //
  // avec à sa droite le pane d'info sur celle-ci et à droite liste de choix   //
  // de la fréquence d'animation.                                              //
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneCentre = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(paneCentre)
  td = ce('td')
  paneCentre.appendChild(td)
  this.paneChoixVar = new PaneChoixVar(app, true)
  td.appendChild(this.paneChoixVar.container)
  td = ce('td')
  paneCentre.appendChild(td)
  this.paneFreq = new PaneFreq(mac.frequenceAnimation, true)
  td.appendChild(this.paneFreq.container)
  if (mac.animationVisible) $(cb).attr('checked', 'checked')
  else $(this.paneFreq.container).css('visibility', 'hidden')
  /// ////////////////////////////////////////////////////////////////////////////
  // Au dessous un panneau de 2 colonnes avec listes de macros                 //
  // A gauche pour le choix de la macro à exécuter avant les boucles           //
  // A droite pour le choix de la macro de fin de boucle                       //
  const indmax = modification ? list.indexOf(mac) - 1 : list.longueur() - 1
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabListes = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(tabListes)
  td = ce('td')
  tabListes.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('MacAvBou'))
  td.appendChild(caption)
  this.listeMacG = new ListeMacros(app, true, indmax, null, true)
  td.appendChild(this.listeMacG.select)
  td = ce('td')
  tabListes.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('MacFinBou'))
  td.appendChild(caption)
  this.listeMacD = new ListeMacros(app, true, indmax, null, true)
  td.appendChild(this.listeMacD.select)
  if (modification) {
    this.paneChoixVar.selectVar(mac.variableAssociee)
    this.listeMacG.selectElt(mac.macroAvantBoucles)
    this.listeMacD.selectElt(mac.macroFinBoucle)
  }
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacBoucAnim', 600)
}

MacBoucDlg.prototype = new MacroDlg()

MacBoucDlg.prototype.OK = function () {
  const mac = this.mac
  const ch = $('#inputint').val()
  if (ch !== '') {
    this.saveBasic()
    mac.variableAssociee = this.paneChoixVar.getVar()
    mac.animationVisible = $('#cb').prop('checked')
    mac.macroAvantBoucles = this.listeMacG.getSelectedItem()
    mac.macroFinBoucle = this.listeMacD.getSelectedItem()
    mac.frequenceAnimation = this.paneFreq.getFreq()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
