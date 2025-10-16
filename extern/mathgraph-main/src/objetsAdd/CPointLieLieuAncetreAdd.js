/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLieLieuAncetre from '../objets/CPointLieLieuAncetre'
import CPointLie from '../objets/CPointLie'
import { getStr } from '../kernel/kernel'
export default CPointLieLieuAncetre

CPointLieLieuAncetre.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo2') + ' ' +
    this.lieuAssocie.getTypeName() + ' ' + this.lieuAssocie.getName()
}

CPointLieLieuAncetre.prototype.depDe4Rec = function (p) {
  return CPointLie.prototype.depDe4Rec.call(this, p) || this.lieuAssocie.depDe4Rec(p)
}

CPointLieLieuAncetre.prototype.lieA = function () {
  return this.lieuAssocie
}

CPointLieLieuAncetre.prototype.estDefiniParObjDs = function (listeOb) {
  return this.lieuAssocie.estDefPar(listeOb)
}
