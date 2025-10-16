/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointParMultVect from '../objets/CPointParMultVect'
import CPt from '../objets/CPt'
import PtParMultVecDlg from '../dialogs/PtParMultVecDlg'
import { getStr } from '../kernel/kernel'
export default CPointParMultVect

CPointParMultVect.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo217') + ' ' + getStr('chinfo218') + '(' +
    this.antecedent.nom + this.nom + ') = ' + this.coef.chaineInfo() + '.' + getStr('chinfo218') + '(' +
    this.vect.point1.getName() + this.vect.point2.getName() + ')'
}

CPointParMultVect.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.vect.depDe4Rec(p) || this.coef.depDe4Rec(p))
}

CPointParMultVect.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPointParMultVect.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PtParMultVecDlg(app, this, true, callBack1, callBack2)
}

CPointParMultVect.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.vect.estDefPar(listeOb) &&
  this.coef.estDefiniParObjDs(listeOb)
}
