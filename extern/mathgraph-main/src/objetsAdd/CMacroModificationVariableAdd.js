/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroModificationVariable from '../objets/CMacroModificationVariable'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacModifVarDlg from '../dialogs/MacModifVarDlg'
export default CMacroModificationVariable

CMacroModificationVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo133') + ' ' + this.variableAssociee.nomCalcul
}

CMacroModificationVariable.prototype.peutEtreMacroFinBoucle = function () {
  return true
}

CMacroModificationVariable.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p) || this.valMin.depDe4Rec(p) ||
    this.valMax.depDe4Rec(p) || this.valPas.depDe4Rec(p) ||
    this.valAct.depDe4Rec(p))
}

CMacroModificationVariable.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacModifVarDlg(app, this, true, callBack1, callBack2)
}

CMacroModificationVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.valMin.estDefiniParObjDs(listeOb) &&
    this.valMax.estDefiniParObjDs(listeOb) &&
    this.valPas.estDefiniParObjDs(listeOb) &&
    this.valAct.estDefiniParObjDs(listeOb) &&
    this.variableAssociee.estDefPar(listeOb)
}
