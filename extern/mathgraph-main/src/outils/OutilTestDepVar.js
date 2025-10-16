/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CTestDependanceVariable from '../objets/CTestDependanceVariable'
import NatCal from '../types/NatCal'
import TestDepVarDlg from '../dialogs/TestDepVarDlg'

export default OutilTestDepVar

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilTestDepVar (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'TestDepVar', 32039, false, false, false, false)
}
OutilTestDepVar.prototype = new Outil()

OutilTestDepVar.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const test = new CTestDependanceVariable(list, null, false, '', null, 0)
  new TestDepVarDlg(this.app, test, false, null, null)
  this.app.activeOutilCapt()
}

OutilTestDepVar.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NTteFoncRouC) > 0
}
