/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLieLigne from '../objets/CPointLieLigne'
import CPointLie from '../objets/CPointLie'
import { getStr } from '../kernel/kernel'
export default CPointLieLigne

CPointLieLigne.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo2') + ' ' +
    this.ligneLiee.getTypeName() + ' ' + this.ligneLiee.getNom()
}

CPointLieLigne.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPointLie.prototype.depDe4Rec.call(this, p) ||
    this.ligneLiee.depDe4Rec(p))
}

CPointLieLigne.prototype.lieA = function () {
  return this.ligneLiee
}

CPointLieLigne.prototype.estDefiniParObjDs = function (listeOb) {
  return this.ligneLiee.estDefPar(listeOb)
}
