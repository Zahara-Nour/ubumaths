/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSuiteRec from '../objets/CSuiteRec'
import { getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
export default CSuiteRec

CSuiteRec.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.premierTerme.depDe4Rec(p) || this.fonctionAssociee.depDe4Rec(p) ||
    this.nombreTermes.depDe4Rec(p))
}

CSuiteRec.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('SuiteRec') + '\n' + getStr('chinfo84') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('PremTerm') + ' ' + this.premierTerme.chaineInfo() + '\n' +
    getStr('chinfo86') + ' ' + this.nombreTermes.chaineInfo()
}

CSuiteRec.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSuiteRec.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SuiteRecDlg(app, this, 1, true, true, callBack1, callBack2)
}

CSuiteRec.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb) &&
  (this.premierTerme.estDefiniParObjDs(listeOb)) &&
  (this.nombreTermes.estDefiniParObjDs(listeOb))
}
