/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroClignotement from '../objets/CMacroClignotement'
import { getStr } from '../kernel/kernel'
import MacClignDlg from '../dialogs/MacClignDlg'
export default CMacroClignotement

CMacroClignotement.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo132') + ' ' + this.listeAssociee.listeNoms()
}

CMacroClignotement.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacClignDlg(app, this, true, callBack1, callBack2)
}
