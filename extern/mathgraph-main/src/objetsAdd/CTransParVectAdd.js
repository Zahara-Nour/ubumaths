/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTransParVect from '../objets/CTransParVect'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CTransParVect

CTransParVect.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.vecteurTrans.depDe4Rec(p))
}

CTransParVect.prototype.complementInfo = function () {
  return getStr('Trans') + ' ' + 'T(' + this.vecteurTrans.point1.getName() + this.vecteurTrans.point2.getName() + ')'
}

CTransParVect.prototype.ajouteAntecedents = function (list) {
  list.add(this.vecteurTrans)
}

CTransParVect.prototype.estDefiniParObjDs = function (listeOb) {
  return this.vecteurTrans.estDefPar(listeOb)
}
