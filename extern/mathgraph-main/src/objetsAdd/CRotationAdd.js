/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CRotation from '../objets/CRotation'
import CTransformation from '../objets/CTransformation'
import RotationDlg from '../dialogs/RotationDlg'
import { getStr } from '../kernel/kernel'
export default CRotation

CRotation.prototype.complementInfo = function () {
  return getStr('Rot') + ' ' + getStr('chinfo202') + ' ' + this.centre.getName() +
    getStr('chinfo205') + ' ' + this.angle.chaineInfo()
}

CRotation.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.centre.depDe4Rec(p) || this.angle.depDe4Rec(p))
}

CRotation.prototype.imageModifiableParMenu = function () {
  return true
}

CRotation.prototype.modifDlg = function (app, callBack1, callBack2) {
  new RotationDlg(app, this, true, callBack1, callBack2)
}

CRotation.prototype.ajouteAntecedents = function (list) {
  list.add(this.centre)
}

CRotation.prototype.estDefiniParObjDs = function (listeOb) {
  return this.centre.estDefPar(listeOb) &&
  this.angle.estDefiniParObjDs(listeOb)
}
