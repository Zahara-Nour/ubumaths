/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleOAB from '../objets/CCercleOAB'
import CCercle from '../objets/CCercle'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'

export default CCercleOAB

CCercleOAB.prototype.utiliseLongueurUnite = function () {
  return !this.inPixels
}

CCercleOAB.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo195') + ' ' + this.o.getName() + ' ' +
    getStr('chinfo197') + ' ' + this.a.getName() + this.b.getName()
}

CCercleOAB.prototype.contientParDefinition = function (po) {
  let rot, trans, vect
  if (po.estPointImage()) {
    // CPointImage ptim = (CPointImage) po;
    if (po.transformation.natureTransformation() === CTransformation.rotation) {
      rot = po.transformation
      return po.antecedent.appartientCercleParDefinition(this) && (rot.centre === this.o)
    } else {
      if (po.transformation.natureTransformation() === CTransformation.translation) {
        trans = po.transformation
        return (trans.or === this.a && trans.ex === this.b)
      } else {
        if (po.transformation.natureTransformation() === CTransformation.translationParVect) {
          vect = po.transformation.vect
          return (vect.point1 === this.a && vect.point2 === this.b)
        } else return false
      }
    }
  } else return false
}

CCercleOAB.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCercle.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.a.depDe4Rec(p) || this.b.depDe4Rec(p))
}

CCercleOAB.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) && this.a.estDefPar(listeOb) && this.b.estDefPar(listeOb)
}

CCercleOAB.prototype.estCercleParCentre = function () {
  return true
}
