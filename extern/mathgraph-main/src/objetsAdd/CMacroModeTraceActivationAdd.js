/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroModeTraceActivation from '../objets/CMacroModeTraceActivation'
import { getStr } from '../kernel/kernel'
import MacActTrDlg from '../dialogs/MacActTrDlg'
export default CMacroModeTraceActivation

CMacroModeTraceActivation.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo170')
}

CMacroModeTraceActivation.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacActTrDlg(app, this, true, callBack1, callBack2)
}
