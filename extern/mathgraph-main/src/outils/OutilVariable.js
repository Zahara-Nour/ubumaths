/*
 * Created by yvesb on 16/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CVariableBornee from '../objets/CVariableBornee'
import VariableDlg from '../dialogs/VariableDlg'
export default OutilVariable

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilVariable (app) {
  Outil.call(this, app, 'Variable', 32884)
}

OutilVariable.prototype = new Outil()

OutilVariable.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const va = new CVariableBornee(app.listePr, null, false, '', 0, 0, 0, 0, '', '', '', false)
  const self = this
  new VariableDlg(app, va, false, null, function () { self.app.activeOutilCapt() })
  this.app.activeOutilCapt()
}
