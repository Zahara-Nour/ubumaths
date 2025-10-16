/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroIncrementationVariable from '../objets/CMacroIncrementationVariable'
import MacIncDecVarDlg from '../dialogs/MacIncDecVarDlg'
import CAffLiePt from '../objets/CAffLiePt'
import NatCal from '../types/NatCal'

export default OutilMacIncVar

/**
 * Outil servant à créer une macro incrémentant une variable
 * L'outil servant à créer une macro décrémentant une variable hérite de cet outil.
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacIncVar (app) {
  if (arguments.length === 0) return
  const b = this.isMacInc()
  OutilMac.call(this, app, b ? 'MacIncVar' : 'MacDecVar', b ? 32948 : 32949)
}

OutilMacIncVar.prototype = new OutilMac()

OutilMacIncVar.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  this.addComClign(point)
  this.mac = this.createMac(point)
  new MacIncDecVarDlg(app, true, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}

/**
 * Fonction qui sera redéfinie dans OutilMacDecVar et renverra false
 * @returns {boolean}
 */
OutilMacIncVar.prototype.isMacInc = function () {
  return true
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacIncVar.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroIncrementationVariable(app.listePr, null, false, app.getCouleur(), point.x, point.y, 0, 0, false,
    null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', null)
}

OutilMacIncVar.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
