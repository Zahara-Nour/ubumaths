/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CUniteyRep from '../objets/CUniteyRep'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import NatCal from '../types/NatCal'
export default OutilUniteyRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilUniteyRep (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'UniteyRep', 32034, false, false, false, false)
}
OutilUniteyRep.prototype = new Outil()

OutilUniteyRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new CUniteyRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 2, false, null, null)
  this.app.activeOutilCapt()
}

OutilUniteyRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
