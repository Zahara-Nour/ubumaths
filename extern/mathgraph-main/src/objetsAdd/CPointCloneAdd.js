/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointClone from '../objets/CPointClone'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CPointClone

CPointClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('PtClone') + ' ' + getStr('of') + ' ' + this.point.getName()
}

CPointClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) || this.point.depDe4Rec(p))
}

CPointClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.point.estDefPar(listeOb)
}

CPointClone.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point === ancienPoint) this.point = nouveauPoint
}

CPointClone.prototype.appartientDroiteParDefinition = function (droite) {
  return this.point.appartientDroiteParDefinition(droite)
}

CPointClone.prototype.appartientCercleParDefinition = function (cercle) {
  return this.point.appartientCercleParDefinition(cercle)
}
