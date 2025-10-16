/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CUnitexRep from '../objets/CUnitexRep'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import NatCal from '../types/NatCal'
export default OutilUnitexRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilUnitexRep (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'UnitexRep', 32033, false, false, false, false)
}
OutilUnitexRep.prototype = new Outil()

OutilUnitexRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new CUnitexRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 2, false, null, null)
  this.app.activeOutilCapt()
}

OutilUnitexRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
