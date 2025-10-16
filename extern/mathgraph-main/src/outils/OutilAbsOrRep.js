/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CAbscisseOrigineRep from '../objets/CAbscisseOrigineRep'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import NatCal from '../types/NatCal'
export default OutilAbsOrRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilAbsOrRep (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'AbsOrRep', 32031, false, false, false, false)
}
OutilAbsOrRep.prototype = new Outil()

OutilAbsOrRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new CAbscisseOrigineRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 0, false, null, null)
  this.app.activeOutilCapt()
}

OutilAbsOrRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
