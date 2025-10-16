/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointInterieurCercle from '../objets/CPointInterieurCercle'
import CPointAncetrePointsMobiles from '../objets/CPointAncetrePointsMobiles'
import { getStr } from '../kernel/kernel'
export default CPointInterieurCercle

CPointInterieurCercle.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo169') + ' ' + this.cercleAssocie.getName()
}

CPointInterieurCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPointAncetrePointsMobiles.prototype.depDe4Rec.call(this, p) ||
    this.cercleAssocie.depDe4Rec(p))
}

CPointInterieurCercle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.cercleAssocie.estDefPar(listeOb)
}
