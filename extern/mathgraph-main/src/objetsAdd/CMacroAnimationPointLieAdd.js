/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAnimationPointLie from '../objets/CMacroAnimationPointLie'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacroAnimDlg from '../dialogs/MacAnimDlg'
export default CMacroAnimationPointLie

CMacroAnimationPointLie.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo124') + ' ' + this.pointLieAssocie.getName()
}

CMacroAnimationPointLie.prototype.estGenereParPointLie = function (pointlie) {
  return this.pointLieAssocie === pointlie
}

CMacroAnimationPointLie.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.pointLieAssocie.depDe4Rec(p))
}

CMacroAnimationPointLie.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacroAnimDlg(app, false, this, true, callBack1, callBack2)
}

CMacroAnimationPointLie.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.pointLieAssocie.estDefPar(listeOb)
}
