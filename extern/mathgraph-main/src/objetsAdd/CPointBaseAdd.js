/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointBase from '../objets/CPointBase'
import CPointAncetrePointsMobiles from '../objets/CPointAncetrePointsMobiles'
import { getStr } from '../kernel/kernel'
export default CPointBase

CPointBase.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('PointLibre')
}

CPointBase.prototype.adaptRes = function (coef) {
  CPointAncetrePointsMobiles.prototype.adaptRes.call(this, coef)
  this.x *= coef
  this.y *= coef
}

CPointBase.prototype.estDefiniParObjDs = function (listeOb) {
  return listeOb.contains(this)
}
