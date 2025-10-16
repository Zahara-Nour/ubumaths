/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroModificationVariable from '../objets/CMacroModificationVariable'
import MacModifVarDlg from '../dialogs/MacModifVarDlg'
import CAffLiePt from '../objets/CAffLiePt'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'

export default OutilMacModifVar

/**
 * Outil servant à créer une macro incrémentant une variable
 * L'outil servant à créer une macro décrémentant une variable hérite de cet outil.
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacModifVar (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacModifVar', 33030)
}

OutilMacModifVar.prototype = new OutilMac()

OutilMacModifVar.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroModificationVariable(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false,
    null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', new CValeur(list, 0), new CValeur(list, 0),
    new CValeur(list, 0), new CValeur(list, 0), null)
  /*
  this.mac = new CMacroModificationVariable(app.listePr, null, false, app.getCouleur(), point.x, point.y, 0, 0, false,
    null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, "", "", null);
    */
  new MacModifVarDlg(app, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}

OutilMacModifVar.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
