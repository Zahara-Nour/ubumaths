/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSuiteRec2 from '../objets/CSuiteRec2'
import { getStr } from '../kernel/kernel'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'

export default CSuiteRec2

CSuiteRec2.prototype.infoHist = function () {
  return this.nomCalcul + ' : ' + getStr('SuiteRec2') + '\n' + getStr('chinfo84') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('PremTerm') + ' ' + this.premierTerme.chaineInfo() + '\n' +
    getStr('chinfo86') + ' ' + this.nombreTermes.chaineInfo()
}

CSuiteRec2.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSuiteRec2.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SuiteRecDlg(app, this, 2, true, true, callBack1, callBack2)
}
