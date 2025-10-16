/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroModeTraceDesactivation from '../objets/CMacroModeTraceDesactivation'
import { getStr } from '../kernel/kernel'
import MacDesactTrDlg from '../dialogs/MacDesactTrDlg'
export default CMacroModeTraceDesactivation

CMacroModeTraceDesactivation.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo171')
}

CMacroModeTraceDesactivation.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacDesactTrDlg(app, this, true, callBack1, callBack2)
}
