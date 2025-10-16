/*
 * Created by yvesb on 15/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CSuiteRec from '../objets/CSuiteRec'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'

export default OutilSuiteRec

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilSuiteRec (app) {
  Outil.call(this, app, 'SuiteRec', 32881)
}
OutilSuiteRec.prototype = new Outil()

OutilSuiteRec.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  const list = this.app.listePr
  const suite = new CSuiteRec(list, null, false, '', null, new CValeur(list, 0), new CValeur(list, 0))
  new SuiteRecDlg(this.app, suite, 1, true, false, function () { self.app.activeOutilCapt() }, null)
  this.app.activeOutilCapt()
}

OutilSuiteRec.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NFoncR1Var) > 0
}
