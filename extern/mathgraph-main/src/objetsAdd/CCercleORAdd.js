/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleOR from '../objets/CCercleOR'
import RayonDlg from '../dialogs/RayonDlg'
import CCercle from '../objets/CCercle'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'

export default CCercleOR

CCercleOR.prototype.utiliseLongueurUnite = function () {
  return !this.inPixels
}

CCercleOR.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo195') + ' ' + this.o.getName() + ' ' +
    getStr('chinfo197') + ' ' + this.r.chaineInfo()
}

CCercleOR.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CCercleOR.prototype.modifDlg = function (app, callBack1, callBack2) {
  new RayonDlg(app, this, true, callBack1, callBack2)
}

CCercleOR.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) {
    // CPointImage ptim = (CPointImage) po;
    if (po.transformation.natureTransformation() === CTransformation.rotation) {
      const rot = po.transformation
      return po.antecedent.appartientCercleParDefinition(this) && (rot.centre === this.o)
    } else return false
  } else return false
}

CCercleOR.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let res = CCercle.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.r.depDe4Rec(p)
  if (!this.inPixels) res = res || this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p)
  return this.memDep4Rec(res)
}

CCercleOR.prototype.adaptRes = function (coef) {
  CCercle.prototype.adaptRes.call(this, coef)
  if (this.inPixels) this.coefMult = coef
}

CCercleOR.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) &&
    this.r.estDefiniParObjDs(listeOb)
}

CCercleOR.prototype.estCercleParCentre = function () {
  return true
}
