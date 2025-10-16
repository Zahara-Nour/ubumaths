/*
 * Created by yvesb on 13/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatCal from '../types/NatCal'
import TangenteDlg from '../dialogs/TangenteDlg'

export default OutilTangente

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilTangente (app) {
  Outil.call(this, app, 'Tangente', 33003)
}
OutilTangente.prototype = new Outil()

OutilTangente.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const callBack = function () { app.activeOutilCapt() }
  new TangenteDlg(this.app, callBack, callBack)
}

OutilTangente.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsCalcul(NatCal.NFoncR1Var) > 0)
}

OutilTangente.prototype.isLineTool = function () {
  return true
}
