/*
 * Created by yvesb on 22/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleOA from '../objets/CCercleOA'
import CCercle from '../objets/CCercle'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'

export default CCercleOA

CCercleOA.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo195') + ' ' + this.o.getName() + ' ' +
    getStr('chinfo196') + ' ' + this.a.getName()
}

/** @inheritDoc */
CCercleOA.prototype.contientParDefinition = function (po) {
  if (this.a === po) return true
  if (po.estPointImage()) {
    if ((po.transformation.natureTransformation() & (CTransformation.rotation | CTransformation.symetrieCentrale)) !== 0) {
      const sr = po.transformation
      return po.antecedent.appartientCercleParDefinition(this) && (sr.centre === this.o)
    } else return false
  } else return false
}

CCercleOA.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCercle.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.a.depDe4Rec(p))
}

CCercleOA.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) &&
  this.a.estDefPar(listeOb)
}

CCercleOA.prototype.estCercleParCentre = function () {
  return true
}
