/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSuiteRecComplexe2 from '../objets/CSuiteRecComplexe2'
import { getStr } from '../kernel/kernel'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
export default CSuiteRecComplexe2

CSuiteRecComplexe2.prototype.infoHist = function () {
  return this.nomCalcul + ' : ' + getStr('SuiteRecComplexe2') + '\n' + getStr('chinfo84') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('PremTerm') + ' ' + this.premierTerme.chaineInfo() + '\n' +
    getStr('chinfo86') + ' ' + this.nombreTermes.chaineInfo()
}

CSuiteRecComplexe2.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSuiteRecComplexe2.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SuiteRecDlg(app, this, 2, false, true, callBack1, callBack2)
}
