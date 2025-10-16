/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CAffLiePt from '../objets/CAffLiePt'
import CMacroAnimationParVar from 'src/objets/CMacroAnimationParVar'
import MacAnimParVarDlg from 'src/dialogs/MacAnimParVarDlg'
import NatCal from 'src/types/NatCal'

export default OutilMacAnimParVar

/**
 * Outil servant à créer une macro d'animation de point lié sans trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAnimParVar (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacAnimParVar', 32950)
}

OutilMacAnimParVar.prototype = new OutilMac()

OutilMacAnimParVar.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroAnimationParVar(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null,
    16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', true, 10, 100, 0, null, false, true, false)
  new MacAnimParVarDlg(app, false, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}

OutilMacAnimParVar.prototype.activationValide = function () {
  return (this.app.listePr.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
