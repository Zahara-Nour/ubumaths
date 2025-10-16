/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroJouantSon from '../objets/CMacroJouantSon'
import { getStr } from '../kernel/kernel'
import MacJouantSonDlg from '../dialogs/MacJouantSonDlg'
export default CMacroJouantSon

CMacroJouantSon.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo123') + ' ' + this.wavePath
}

CMacroJouantSon.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacJouantSonDlg(app, this, true, callBack1, callBack2)
}
