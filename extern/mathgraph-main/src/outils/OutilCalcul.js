/*
 * Created by yvesb on 02/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CCalcul from '../objets/CCalcul'
import CalculDlg from '../dialogs/CalculDlg'
export default OutilCalcul

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCalcul (app) {
  Outil.call(this, app, 'Calcul', 32879)
}
OutilCalcul.prototype = new Outil()

OutilCalcul.prototype.select = function () {
  Outil.prototype.select.call(this)
  const calc = new CCalcul(this.app.listePr, null, false, '', '', null)
  new CalculDlg(this.app, calc, false, true, null, null)
  this.app.activeOutilCapt()
}
