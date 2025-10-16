/*
 * Created by yvesb on 20/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import GraduationAxesDlg from '../dialogs/GraduationAxesDlg'
import NatCal from '../types/NatCal'

export default OutilGraduationAxes

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilGraduationAxes (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'GraduationAxes', 32035, false, false, false, false)
}
OutilGraduationAxes.prototype = new Outil()

OutilGraduationAxes.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  new GraduationAxesDlg(app, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilGraduationAxes.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
