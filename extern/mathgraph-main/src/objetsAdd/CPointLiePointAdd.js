/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLiePoint from '../objets/CPointLiePoint'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CPointLiePoint

CPointLiePoint.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo2') + ' ' + this.pointAssocie.getName()
}

CPointLiePoint.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.pointAssocie.depDe4Rec(p))
}

CPointLiePoint.prototype.lieA = function () {
  return this.pointAssocie
}

CPointLiePoint.prototype.estDefiniParObjDs = function (listeOb) {
  return this.pointAssocie.estDefPar(listeOb)
}
