/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CIntCercleCercle from '../objets/CIntCercleCercle'
import CBipoint from '../objets/CBipoint'
import { getStr } from '../kernel/kernel'
export default CIntCercleCercle

CIntCercleCercle.prototype.infoHist = function () {
  return getStr('chinfo193') + ' ' + this.c1.getTypeName() + ' ' + this.c1.getName() +
    ' ' + getStr('chinfo194') + ' ' + this.c2.getTypeName() + ' ' + this.c2.getName()
}

CIntCercleCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CBipoint.prototype.depDe4Rec.call(this, p) ||
    this.c1.depDe4Rec(p) || this.c2.depDe4Rec(p))
}

CIntCercleCercle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.c1.estDefPar(listeOb) &&
  this.c2.estDefPar(listeOb)
}
