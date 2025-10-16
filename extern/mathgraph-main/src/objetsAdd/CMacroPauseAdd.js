/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroPause from '../objets/CMacroPause'
import { getStr } from '../kernel/kernel'
import MacPauseDlg from '../dialogs/MacPauseDlg'
export default CMacroPause

CMacroPause.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo134') + ' ' + this.dureePause + ' s'
}

CMacroPause.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacPauseDlg(app, this, true, callBack1, callBack2)
}
