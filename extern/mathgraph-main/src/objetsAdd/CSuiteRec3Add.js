/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSuiteRec3 from '../objets/CSuiteRec3'
import { getStr } from '../kernel/kernel'
import CSuiteRec from '../objets/CSuiteRec'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
export default CSuiteRec3

CSuiteRec3.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSuiteRec.prototype.depDe4Rec.call(this, p) ||
    this.deuxiemeTerme.depDe4Rec(p))
}

CSuiteRec3.prototype.infoHist = function () {
  return this.nomCalcul + ' : ' + getStr('SuiteRec3') + '\n' + getStr('chinfo84') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('PremTerm') + ' ' + this.premierTerme.chaineInfo() + '\n' +
    getStr('chinfo186') + ' ' + this.deuxiemeTerme.chaineInfo() + '\n' +
    getStr('chinfo86') + ' ' + this.nombreTermes.chaineInfo()
}

CSuiteRec3.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSuiteRec3.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SuiteRecDlg(app, this, 3, true, true, callBack1, callBack2)
}
