/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroIncrementationVariable from '../objets/CMacroIncrementationVariable'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacIncDecVarDlg from '../dialogs/MacIncDecVarDlg'

export default CMacroIncrementationVariable

CMacroIncrementationVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo121') + ' ' + getStr('chinfo122Bis') +
    ' ' + this.variableAssociee.nomCalcul
}

CMacroIncrementationVariable.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p))
}

CMacroIncrementationVariable.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacIncDecVarDlg(app, true, this, true, callBack1, callBack2)
}

CMacroIncrementationVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.variableAssociee.estDefPar(listeOb)
}
