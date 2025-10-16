/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroClignotement from '../objets/CMacroClignotement'
import CSousListeObjets from '../objets/CSousListeObjets'
import MacClignDlg from '../dialogs/MacClignDlg'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacClign

/**
 * Outil servant à mesurer en créer une macro de clignotement d'objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacClign (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacClign', 33015)
}

OutilMacClign.prototype = new OutilMac()

OutilMacClign.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacClign.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacClign.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroClignotement(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', this.liste, 0)
    new MacClignDlg(app, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageCre
        app.outilPointageActif.aDesigner = NatObj.NTtObj
        app.outilPointageActif.reset()
        app.indication('indMacClign')
      },
      function () { app.activeOutilCapt() })
  } else {
    this.liste.add(elg)
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    if (this.liste.longueur() !== 0) this.app.showStopButton(true)
  }
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacClign.prototype.actionFin = function () {
  this.creeObjet()
}
