/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSuiteRecComplexe3 from '../objets/CSuiteRecComplexe3'
import { getStr } from '../kernel/kernel'
import CSuiteRecComplexe from '../objets/CSuiteRecComplexe'
import SuiteRecDlg from '../dialogs/SuiteRecDlg'
export default CSuiteRecComplexe3

CSuiteRecComplexe3.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSuiteRecComplexe.prototype.depDe4Rec.call(this, p) ||
    this.deuxiemeTerme.depDe4Rec(p))
}

CSuiteRecComplexe3.prototype.infoHist = function () {
  return this.nomCalcul + ' : ' + getStr('SuiteRecComplexe3') + ' \n' + getStr('chinfo84') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('PremTerm') + ' ' + this.premierTerme.chaineInfo() + '\n' +
    getStr('chinfo186') + ' ' + this.deuxiemeTerme.chaineInfo() + '\n' +
    getStr('chinfo86') + ' ' + this.nombreTermes.chaineInfo()
}

CSuiteRecComplexe3.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSuiteRecComplexe3.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SuiteRecDlg(app, this, 3, false, true, callBack1, callBack2)
}

CSuiteRecComplexe3.prototype.estDefiniParObjDs = function (listeOb) {
  return CSuiteRecComplexe.prototype.estDefiniParObjDs.call(this, listeOb) &&
  (this.deuxiemeTerme.estDefiniParObjDs(listeOb))
}
