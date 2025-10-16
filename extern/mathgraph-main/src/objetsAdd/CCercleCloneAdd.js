/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleClone from '../objets/CCercleClone'
import CCercle from '../objets/CCercle'
import { getStr } from '../kernel/kernel'
export default CCercleClone

CCercleClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('CercClone') + ' ' + getStr('of') + ' ' + this.cercle.getName()
}
CCercleClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCercle.prototype.depDe4Rec.call(this, p) || this.cercle.depDe4Rec(p))
}
CCercleClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.cercle.estDefPar(listeOb)
}
CCercleClone.prototype.contientParDefinition = function (po) {
  return this.cercle.contientParDefinition(po)
}
