/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroApparition from '../objets/CMacroApparition'
import CSousListeObjets from '../objets/CSousListeObjets'
import MacAppDispDlg from '../dialogs/MacAppDispDlg'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacApp

/**
 * Outil servant à mesurer en créer une macro d'apparition d'objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacApp (app) {
  if (arguments.length === 0) return
  const b = this.isMacApp()
  OutilMac.call(this, app, b ? 'MacApp' : 'MacDisp', b ? 32944 : 32945)
}

OutilMacApp.prototype = new OutilMac()

OutilMacApp.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacApp.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacApp.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const b = this.isMacApp()
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = this.createMac(point)
    new MacAppDispDlg(app, b, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageCre
        app.outilPointageActif.aDesigner = NatObj.NTtObj
        app.outilPointageActif.reset()
        app.indication(b ? 'indMacApp' : 'indMacDisp')
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
 * Fonction qui sera redéfinie dans OutilMacDisp et renverra false
 * @returns {boolean}
 */
OutilMacApp.prototype.isMacApp = function () {
  return true
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacApp.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroApparition(app.listePr, null, false, app.getCouleur(), point.x, point.y,
    0, 0, false, null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', this.liste, false)
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacApp.prototype.actionFin = function () {
  this.creeObjet()
}
