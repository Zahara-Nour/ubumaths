/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CIntDroiteCercle from '../objets/CIntDroiteCercle'
import CBipoint from '../objets/CBipoint'
import { getStr } from '../kernel/kernel'
export default CIntDroiteCercle

CIntDroiteCercle.prototype.infoHist = function () {
  return getStr('chinfo193') + ' ' + this.d.getTypeName() + ' ' + this.d.getNom() + ' ' +
    getStr('chinfo194') + ' ' + this.c.getTypeName() + ' ' + this.c.getName()
}

CIntDroiteCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CBipoint.prototype.depDe4Rec.call(this, p) ||
    this.d.depDe4Rec(p) || this.c.depDe4Rec(p))
}

CIntDroiteCercle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.d.estDefPar(listeOb) &&
  this.c.estDefPar(listeOb)
}
