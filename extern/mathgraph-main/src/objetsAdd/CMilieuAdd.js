/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMilieu from '../objets/CMilieu'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CMilieu

CMilieu.prototype.infoHist = function () {
  return this.nom + ' : ' + getStr('Milieu') + ' ' + getStr('of') + ' ' +
    '[' + this.point1.getName() + this.point2.getName() + ']'
}

CMilieu.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.point1.depDe4Rec(p) || this.point2.depDe4Rec(p))
}

CMilieu.prototype.appartientDroiteParDefinition = function (droite) {
  /* Modifié version 6.9.1
  return CPt.prototype.appartientDroiteParDefinition.call(this, droite) ||
    (this.point1.appartientDroiteParDefinition(droite) && this.point2.appartientDroiteParDefinition(droite))
   */
  // CPt.prototype.appartientDroiteParDefinition.call renvoie true si la droite contient this par définition
  return CPt.prototype.appartientDroiteParDefinition.call(this, droite) ||
    (this.point1.appartientDroiteParDefinition(droite) && this.point2.appartientDroiteParDefinition(droite))
}

CMilieu.prototype.estDefiniParObjDs = function (listeOb) {
  return this.point1.estDefPar(listeOb) &&
  this.point2.estDefPar(listeOb)
}
