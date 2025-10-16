/*
 * Created by yvesb on 13/052/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from '../outils/Outil'
import QuadrillageDlg from '../dialogs/QuadrillageDlg'
import NatCal from '../types/NatCal'

export default OutilQuadrillage

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilQuadrillage (app) {
  Outil.call(this, app, 'Quadrillage', 33043, false, false, false, false)
}

OutilQuadrillage.prototype = new Outil()

OutilQuadrillage.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  new QuadrillageDlg(app, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilQuadrillage.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
