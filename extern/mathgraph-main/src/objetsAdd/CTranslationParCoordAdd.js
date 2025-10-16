/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTranslationParCoord from '../objets/CTranslationParCoord'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
import TransParCoordDlg from '../dialogs/TransParCoordDlg'
export default CTranslationParCoord

CTranslationParCoord.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.rep.depDe4Rec(p) || this.x.depDe4Rec(p) || this.y.depDe4Rec(p))
}

CTranslationParCoord.prototype.complementInfo = function () {
  return getStr('Trans') + ' ' + 'T(' + this.x.chaineInfo() + ';' + this.y.chaineInfo() + ')' + ' ' +
    getStr('chinfo32') + ' ' + this.rep.getNom()
}

CTranslationParCoord.prototype.imageModifiableParMenu = function () {
  return true
}

CTranslationParCoord.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TransParCoordDlg(app, this, true, callBack1, callBack2)
}

CTranslationParCoord.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb) &&
  this.x.estDefiniParObjDs(listeOb) &&
  this.y.estDefiniParObjDs(listeOb)
}
