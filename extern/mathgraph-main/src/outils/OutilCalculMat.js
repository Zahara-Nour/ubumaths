/*
 * Created by yvesb on 02/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CCalcMat from '../objets/CCalcMat'
import CalcMatDlg from '../dialogs/CalcMatDlg'
import NatCal from '../types/NatCal'
import Nat from '../types/Nat'
export default OutilCalculMat

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCalculMat (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CalculMat', 32047, false, false, false, false)
}
OutilCalculMat.prototype = new Outil()

OutilCalculMat.prototype.select = function () {
  Outil.prototype.select.call(this)
  const calc = new CCalcMat(this.app.listePr, null, false, '', '', null)
  new CalcMatDlg(this.app, calc, false, null, null)
  this.app.activeOutilCapt()
}

OutilCalculMat.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(Nat.or(NatCal.NTteMatrice, NatCal.NTteValR)) > 0)
}
