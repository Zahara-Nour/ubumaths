/*
 * Created by yvesb on 07/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatCal from '../types/NatCal'
import CourbeFoncDlg from '../dialogs/CourbeFoncDlg'

export default OutilCourbeFonc

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCourbeFonc (app) {
  Outil.call(this, app, 'CourbeFonc', 32984)
}
OutilCourbeFonc.prototype = new Outil()

OutilCourbeFonc.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const callBack = function () { app.activeOutilCapt() }
  new CourbeFoncDlg(app, callBack, callBack)
}

OutilCourbeFonc.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsCalcul(NatCal.NFoncR1Var) > 0)
}

OutilCourbeFonc.prototype.isLineTool = function () {
  return true
}
