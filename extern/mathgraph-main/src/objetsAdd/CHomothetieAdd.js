/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CHomothetie from '../objets/CHomothetie'
import HomothetieDlg from '../dialogs/HomothetieDlg'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CHomothetie

CHomothetie.prototype.complementInfo = function () {
  return getStr('Hom') + ' ' + getStr('chinfo202') + ' ' + this.centre.getName() +
    getStr('chinfo28') + ' ' + this.rapport.chaineInfo()
}

CHomothetie.prototype.imageModifiableParMenu = function () {
  return true
}

CHomothetie.prototype.modifDlg = function (app, callBack1, callBack2) {
  new HomothetieDlg(app, this, true, callBack1, callBack2)
}

CHomothetie.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.centre.depDe4Rec(p) || this.rapport.depDe4Rec(p))
}

CHomothetie.prototype.ajouteAntecedents = function (list) {
  list.add(this.centre)
}

CHomothetie.prototype.estDefiniParObjDs = function (listeOb) {
  return this.centre.estDefPar(listeOb) &&
  this.rapport.estDefiniParObjDs(listeOb)
}
