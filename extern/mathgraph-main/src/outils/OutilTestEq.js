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
import CTestEquivalence from '../objets/CTestEquivalence'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'
import TestEqFactDlg from '../dialogs/TestEqFactDlg'

export default OutilTestEq

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilTestEq (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'TestEq', 32037, false, false, false, false)
}
OutilTestEq.prototype = new Outil()

OutilTestEq.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CTestEquivalence(list, null, false, '', null, null, true, false, new CValeur(list, 1), true, true, false)
  new TestEqFactDlg(this.app, part, false, true, null, null)
  this.app.activeOutilCapt()
}

OutilTestEq.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NCalcouFoncParFormule) >= 2)
}
