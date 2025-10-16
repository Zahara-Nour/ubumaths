/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAffectationValeurVariable from '../objets/CMacroAffectationValeurVariable'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacAffValVarDlg from '../dialogs/MacAffValVarDlg'
export default CMacroAffectationValeurVariable

CMacroAffectationValeurVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo127') + ' ' + this.valeurAssociee.chaineInfo() +
    '  ' + getStr('chinfo128') + ' ' + this.variableAssociee.nomCalcul
}

CMacroAffectationValeurVariable.prototype.peutEtreMacroFinBoucle = function () {
  return true
}

CMacroAffectationValeurVariable.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p) || this.valeurAssociee.depDe4Rec(p))
}

CMacroAffectationValeurVariable.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacAffValVarDlg(app, this, true, callBack1, callBack2)
}
// Abandonné
/*
CMacroAffectationValeurVariable.prototype.metAJourPourCreation = function() {
  this.metAJour();
};
*/
