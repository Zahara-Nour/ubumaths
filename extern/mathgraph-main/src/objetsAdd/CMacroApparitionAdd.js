/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroApparition from '../objets/CMacroApparition'
import { getStr } from '../kernel/kernel'
import MacroAppDispDlg from '../dialogs/MacAppDispDlg'
export default CMacroApparition

CMacroApparition.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo119') + this.listeAssociee.listeNoms()
}

CMacroApparition.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacroAppDispDlg(app, true, this, true, callBack1, callBack2)
}
