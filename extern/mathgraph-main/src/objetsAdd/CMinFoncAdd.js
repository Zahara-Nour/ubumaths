/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMinFonc from '../objets/CMinFonc'
import { getStr } from '../kernel/kernel'
import MaxMinDlg from '../dialogs/MaxMinDlg'
export default CMinFonc

CMinFonc.prototype.description = function () {
  return getStr('chinfo177')
}

CMinFonc.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MaxMinDlg(app, this, true, false, callBack1, callBack2)
}
