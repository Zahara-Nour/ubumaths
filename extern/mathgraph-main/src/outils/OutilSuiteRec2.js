/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CSuiteRec2 from '../objets/CSuiteRec2'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'

export default OutilSuiteRec2

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilSuiteRec2 (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'SuiteRec2', 32043, false, false, false, false)
}
OutilSuiteRec2.prototype = new Outil()

OutilSuiteRec2.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  const list = this.app.listePr
  const suite = new CSuiteRec2(list, null, false, '', null, new CValeur(list, 0), new CValeur(list, 0))
  new SuiteRecDlg(this.app, suite, 2, true, false, function () { self.app.activeOutilCapt() }, null)
  this.app.activeOutilCapt()
}

OutilSuiteRec2.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NFonction2Var) > 0
}
