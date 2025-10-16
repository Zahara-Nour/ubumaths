/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroAffectationValeurVariable from '../objets/CMacroAffectationValeurVariable'
import MacAffValVarDlg from '../dialogs/MacAffValVarDlg'
import CAffLiePt from '../objets/CAffLiePt'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'

export default OutilMacAffValVar

/**
 * Outil servant à créer une macro affectant une valeur à une variable
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAffValVar (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacAnim', 32947)
}

OutilMacAffValVar.prototype = new OutilMac()

OutilMacAffValVar.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroAffectationValeurVariable(list, null, false, app.getCouleur(), point.x, point.y, 0, 0,
    false, null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', new CValeur(app.listePr, 0), null)
  new MacAffValVarDlg(app, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}

OutilMacAffValVar.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
