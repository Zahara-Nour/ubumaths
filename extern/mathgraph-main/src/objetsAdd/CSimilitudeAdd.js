/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSimilitude from '../objets/CSimilitude'
import CRotation from '../objets/CRotation'
import SimilitudeDlg from '../dialogs/SimilitudeDlg'
import { getStr } from '../kernel/kernel'
export default CSimilitude

CSimilitude.prototype.complementInfo = function () {
  return getStr('Sim') + ' ' + getStr('chinfo202') + ' ' + this.centre.getName() +
    getStr('chinfo205') + ' ' + this.angle.chaineInfo() + ' ' + getStr('chinfo28') + ' ' + this.rapport.chaineInfo()
}

CSimilitude.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CRotation.prototype.depDe4Rec.call(this, p) ||
    this.rapport.depDe4Rec(p))
}

CSimilitude.prototype.imageModifiableParMenu = function () {
  return true
}

CSimilitude.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SimilitudeDlg(app, this, true, callBack1, callBack2)
}

CSimilitude.prototype.ajouteAntecedents = function (list) {
  list.add(this.centre)
}

CSimilitude.prototype.estDefiniParObjDs = function (listeOb) {
  return CRotation.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.angle.estDefiniParObjDs(listeOb) &&
  this.rapport.estDefiniParObjDs(listeOb)
}
