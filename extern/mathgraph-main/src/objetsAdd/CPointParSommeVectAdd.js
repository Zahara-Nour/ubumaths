/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointParSommeVect from '../objets/CPointParSommeVect'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CPointParSommeVect

CPointParSommeVect.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo217') + ' ' + getStr('chinfo218') + '(' +
    this.antecedent.getName() + this.getName() + ') = ' + getStr('chinfo218') + '(' +
    this.vecteur1.point1.getName() + this.vecteur1.point2.getName() + ') + ' +
    getStr('chinfo218') + '(' + this.vecteur2.point1.getName() + this.vecteur2.point2.getName() + ')'
}

CPointParSommeVect.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.vecteur1.depDe4Rec(p) || this.vecteur2.depDe4Rec(p))
}

CPointParSommeVect.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.vecteur1.estDefPar(listeOb) &&
  this.vecteur2.estDefPar(listeOb)
}
