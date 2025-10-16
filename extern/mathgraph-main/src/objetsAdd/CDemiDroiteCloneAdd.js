/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroiteClone from '../objets/CDemiDroiteClone'
import CDemiDroite from '../objets/CDemiDroite'
import { getStr } from '../kernel/kernel'
export default CDemiDroiteClone

CDemiDroiteClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('DdteClone') + ' ' + getStr('of') + ' ' + this.demidroite.getName()
}
CDemiDroiteClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDemiDroite.prototype.depDe4Rec.call(this, p) || this.demidroite.depDe4Rec(p))
}
CDemiDroiteClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.demidroite.estDefPar(listeOb)
}
CDemiDroiteClone.prototype.contientParDefinition = function (po) {
  return this.demidroite.contientParDefinition(po)
}
