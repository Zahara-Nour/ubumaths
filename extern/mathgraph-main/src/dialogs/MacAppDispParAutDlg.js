/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import CSousListeObjets from '../objets/CSousListeObjets'
import $ from 'jquery'
import addQueue from '../kernel/addQueue'

export default MacroAppDispParAutDlg

/**
 * Dialogue de création d'une macro d'apparition ou de disparition d'objets à partir des objets d'une autre macro
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param bApparition true pour une macro d'apparition, false pour une macro de disparition
 * mac La macro d'apprition ou de disparition passée en paramètre
 * param callBackOK Fonction de callBack à appler àprès appui sur OK
 * param callBackOK Fonction de callBack à appler àprès appui sur Cancel
 */
function MacroAppDispParAutDlg (app, bApparition, mac, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, false, callBackOK, callBackCancel)
  this.bApparition = bApparition
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé //////////////////////////////
  this.addEditInt(tabPrincipal)
  /// /////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const label = ce('label')
  $(label).html(getStr('MacAppDispDlg1'))
  tr.appendChild(label)
  this.inf = app.listePr.listeMacrosAvecListeModif(false)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.select = ce('select', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:300px'
  })
  const self = this
  this.select.onchange = function () {
    self.onSelectChange()
  }

  tr.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }

  /// ///////////////////////////////////////////////////////////////
  // En bas, ajout d'un tableau de trois colonnes contenant un
  // panneau de choix de mode d'alignement et un panneau de choix
  // de taille de police
  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.onSelectChange()

  this.create(bApparition ? 'MacAppParAut' : 'MacDispParAut', 500)
}

MacroAppDispParAutDlg.prototype = new MacroDlg()

MacroAppDispParAutDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const app = this.app
  if ($('#inputint').val() !== '') {
    const selectedMac = this.inf.pointeurs[this.select.selectedIndex]
    const list = selectedMac.listeAssociee
    // Il ne faut pas affecter à la macro la même liste que celle choisie car sinon si on ajoute ou retire
    // des objets à la permière ils seront aussi rajoutés ou supprimés de la nouvelle.
    const newlist = new CSousListeObjets()
    for (let i = 0; i < list.longueur(); i++) newlist.add(list.get(i))
    this.mac.listeAssociee = newlist
    this.saveBasic()
    app.ajouteElement(this.mac)
    this.mac.setReady4MathJax()
    addQueue(() => {
      this.mac.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    })
    this.app.gestionnaire.enregistreFigureEnCours(this.bApparition ? 'MacAppParAut' : 'MacDispParAut')
    this.destroy()
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}

MacroAppDispParAutDlg.prototype.onSelectChange = function () {
  $('#ta').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}
