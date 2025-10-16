/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroDisparition from '../objets/CMacroDisparition'
import { getStr } from '../kernel/kernel'
import MacroAppDispDlg from '../dialogs/MacAppDispDlg'

export default CMacroDisparition

CMacroDisparition.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo120') + this.listeAssociee.listeNoms()
}

CMacroDisparition.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacroAppDispDlg(app, false, this, true, callBack1, callBack2)
}
