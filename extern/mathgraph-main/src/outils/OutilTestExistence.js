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
import CTestExistence from '../objets/CTestExistence'
import NatCal from '../types/NatCal'
import TestExistenceDlg from '../dialogs/TestExistenceDlg'

export default OutilTestExistence

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilTestExistence (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'TestExistence', 33032, false, false, false, false)
}
OutilTestExistence.prototype = new Outil()

OutilTestExistence.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CTestExistence(list, null, false, '', null)
  new TestExistenceDlg(this.app, part, false, null, null)
  this.app.activeOutilCapt()
}

OutilTestExistence.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NTteValROuC) > 0)
}
