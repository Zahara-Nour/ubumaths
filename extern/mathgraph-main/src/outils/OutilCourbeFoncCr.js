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
import CourbeFoncAvecCrochetsDlg from '../dialogs/CourbeFoncAvecCrochetsDlg'

export default OutilCourbeFoncCr

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCourbeFoncCr (app) {
  Outil.call(this, app, 'CourbeFoncCr', 32985)
}
OutilCourbeFoncCr.prototype = new Outil()

OutilCourbeFoncCr.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const callBack = function () { app.activeOutilCapt() }
  new CourbeFoncAvecCrochetsDlg(this.app, callBack, callBack)
}

OutilCourbeFoncCr.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsCalcul(NatCal.NFoncR1Var) > 0)
}

OutilCourbeFoncCr.prototype.isLineTool = function () {
  return true
}
