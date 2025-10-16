/*
 * Created by yvesb on 22/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAutrePointIntersectionCercles from '../objets/CAutrePointIntersectionCercles'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'

export default CAutrePointIntersectionCercles

CAutrePointIntersectionCercles.prototype.infoHist = function () {
  let ch = this.getName() + ' : '
  ch += getStr('chinfo193') + ' ' + this.c1.getName() + ' ' + getStr('chinfo194') + ' ' + this.c2.getName() +
    ', ' + getStr('chinfo227') + ' ' + this.pointExclu.getName()
  return ch
}

CAutrePointIntersectionCercles.prototype.appartientCercleParDefinition = function (cercle) {
  return CPt.prototype.appartientCercleParDefinition.call(this, cercle) || (cercle === this.c1) || (cercle === this.c2)
}

CAutrePointIntersectionCercles.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) || this.c1.depDe4Rec(p) ||
    this.c2.depDe4Rec(p) || this.pointExclu.depDe4Rec(p))
}

CAutrePointIntersectionCercles.prototype.estDefiniParObjDs = function (listeOb) {
  return this.c1.estDefPar(listeOb) &&
  this.c2.estDefPar(listeOb) &&
  this.pointExclu.estDefPar(listeOb)
}
