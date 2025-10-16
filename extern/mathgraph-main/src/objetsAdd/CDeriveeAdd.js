/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CDerivee from '../objets/CDerivee'
import { getStr } from '../kernel/kernel'
import CFonc from '../objets/CFonc'
import DeriveeDlg from '../dialogs/DeriveeDlg'
export default CDerivee

CDerivee.prototype.info = function () {
  return this.infoHist()
}

CDerivee.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('ch112') + ' ' + this.fonctionAssociee.getNom()
}

CDerivee.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CDerivee.prototype.modifDlg = function (app, callBack1, callBack2) {
  new DeriveeDlg(app, this, true, callBack1, callBack2)
}

CDerivee.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CFonc.prototype.depDe4Rec.call(this, p) || this.fonctionAssociee.depDe4Rec(p))
}

CDerivee.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb)
}
