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
import CTestEqNatOp from '../objets/CTestEqNatOp'
import NatCal from '../types/NatCal'
import TestEqNatOpDlg from '../dialogs/TestEqNatOpDlg'

export default OutilTestEqNatOp

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilTestEqNatOp (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'TestEqNatOp', 32041, false, false, false, false)
}
OutilTestEqNatOp.prototype = new Outil()

OutilTestEqNatOp.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  // var part = new CTestEqNatOp(list, null, false, "", null, null, true, false, new CValeur(list, 1), true);
  const part = new CTestEqNatOp(list, null, false, '', null, null)
  new TestEqNatOpDlg(this.app, part, false, null, null)
  this.app.activeOutilCapt()
}

OutilTestEqNatOp.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NCalcouFoncParFormule) >= 2)
}
