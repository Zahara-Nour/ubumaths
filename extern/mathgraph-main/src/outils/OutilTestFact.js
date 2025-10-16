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
import CTestFact from '../objets/CTestFact'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'
import TestEqFactDlg from '../dialogs/TestEqFactDlg'

export default OutilTestFact

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilTestFact (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'TestFact', 33058, false, false, false, false)
}
OutilTestFact.prototype = new Outil()

OutilTestFact.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CTestFact(list, null, false, '', null, null, true, false, new CValeur(list, 1), true, true, false)
  new TestEqFactDlg(this.app, part, false, false, null, null)
  this.app.activeOutilCapt()
}

OutilTestFact.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NCalcouFoncParFormule) >= 2)
}
