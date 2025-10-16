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
import CSuiteRecComplexe2 from '../objets/CSuiteRecComplexe2'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
import CValeur from '../objets/CValeur'
import CValeurComp from '../objets/CValeurComp'
import NatCal from '../types/NatCal'

export default OutilSuiteRecComplexe2

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilSuiteRecComplexe2 (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'SuiteRecComplexe2', 32042, false, false, false, false)
}
OutilSuiteRecComplexe2.prototype = new Outil()

OutilSuiteRecComplexe2.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  const list = this.app.listePr
  const suite = new CSuiteRecComplexe2(list, null, false, '', null, new CValeur(list, 0), new CValeurComp(list))
  new SuiteRecDlg(this.app, suite, 2, false, false, function () { self.app.activeOutilCapt() }, null)
  this.app.activeOutilCapt()
}

OutilSuiteRecComplexe2.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NFonctionComplexe2Var) > 0
}
