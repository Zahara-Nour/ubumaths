/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCentreGravite from '../objets/CCentreGravite'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CCentreGravite

CCentreGravite.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('CentreGrav') + ' ' + getStr('of') + ' ' + this.point1.getName() +
    this.point2.getName() + this.point3.getName()
}

CCentreGravite.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.point1.depDe4Rec(p) ||
    this.point2.depDe4Rec(p) ||
    this.point3.depDe4Rec(p))
}

CCentreGravite.prototype.estDefiniParObjDs = function (listeOb) {
  return this.point1.estDefPar(listeOb) &&
  this.point2.estDefPar(listeOb) &&
  this.point3.estDefPar(listeOb)
}

CCentreGravite.prototype.appartientDroiteParDefinition = function (droite) {
  return CPt.prototype.appartientDroiteParDefinition.call(this, droite) || (this.point1.appartientDroiteParDefinition(droite) &&
    this.point2.appartientDroiteParDefinition(droite) && this.point3.appartientDroiteParDefinition(droite))
}
