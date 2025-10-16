/*
 * Created by yvesb on 30/12/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CCalculComplexe from '../objets/CCalculComplexe'
import CalculDlg from '../dialogs/CalculDlg'

export default OutilCalculComp

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCalculComp (app) {
  Outil.call(this, app, 'CalculComp', 33133)
}
OutilCalculComp.prototype = new Outil()

OutilCalculComp.prototype.select = function () {
  Outil.prototype.select.call(this)
  const calc = new CCalculComplexe(this.app.listePr, null, false, '', '', null)
  new CalculDlg(this.app, calc, false, false, null, null)
  this.app.activeOutilCapt()
}
