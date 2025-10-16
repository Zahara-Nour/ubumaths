/*
 * Created by yvesb on 22/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAutrePointIntersectionDroiteCercle from '../objets/CAutrePointIntersectionDroiteCercle'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CAutrePointIntersectionDroiteCercle

CAutrePointIntersectionDroiteCercle.prototype.infoHist = function () {
  let ch = this.nom + ' : '
  ch += getStr('chinfo193') + ' ' + this.d.getNom() + ' ' + getStr('chinfo194') + ' ' + this.c.nom +
    ', ' + getStr('chinfo227') + ' ' + this.pointExclu.nom
  return ch
}

CAutrePointIntersectionDroiteCercle.prototype.appartientDroiteParDefinition = function (droite) {
  // Modifié version 6.9.1
  // return CPt.prototype.appartientDroiteParDefinition.call(this, droite) || (droite === this.d)
  return (droite === this.d) || CPt.prototype.appartientDroiteParDefinition.call(this, droite)
}

CAutrePointIntersectionDroiteCercle.prototype.appartientCercleParDefinition = function (cercle) {
  // Modifié version 6.9.1
  // return CPt.prototype.appartientCercleParDefinition.call(this, cercle) || (cercle === this.c)
  return cercle.contientParDefinition(this) || (cercle === this.c)
}

CAutrePointIntersectionDroiteCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.c.depDe4Rec(p) || this.d.depDe4Rec(p) || this.pointExclu.depDe4Rec(p))
}

CAutrePointIntersectionDroiteCercle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.c.estDefPar(listeOb) &&
  this.d.estDefPar(listeOb) &&
  this.pointExclu.estDefPar(listeOb)
}
