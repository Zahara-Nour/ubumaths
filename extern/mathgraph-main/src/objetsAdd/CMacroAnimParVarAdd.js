/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAnimationParVar from '../objets/CMacroAnimationParVar'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacAnimParVarDlg from 'src/dialogs/MacAnimParVarDlg'
export default CMacroAnimationParVar

CMacroAnimationParVar.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo124') + ' ' + this.variableAssociee.nomCalcul
}

CMacroAnimationParVar.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p))
}

CMacroAnimationParVar.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacAnimParVarDlg(app, false, this, true, callBack1, callBack2)
}

CMacroAnimationParVar.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.variableAssociee.estDefPar(listeOb)
}
