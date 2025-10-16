/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAffichantTout from '../objets/CMacroAffichantTout'
import MacReaffDlg from '../dialogs/MacReaffDlg'
import { getStr } from '../kernel/kernel'
export default CMacroAffichantTout

CMacroAffichantTout.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo129')
}

CMacroAffichantTout.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacReaffDlg(app, this, true, callBack1, callBack2)
}
