/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroTraceAutoParVariable from '../objets/CMacroTraceAutoParVariable'
import CMacroAvecListe from '../objets/CMacroAvecListe'
import { getStr } from '../kernel/kernel'
import MacTraceAutoVaDlg from '../dialogs/MacTraceAutoVaDlg'
export default CMacroTraceAutoParVariable

CMacroTraceAutoParVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo137') + ' ' + this.variableAssociee.nomCalcul
}

CMacroTraceAutoParVariable.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacroAvecListe.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p))
}

CMacroTraceAutoParVariable.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacTraceAutoVaDlg(app, this, true, callBack1, callBack2)
}

CMacroTraceAutoParVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacroAvecListe.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.variableAssociee.estDefPar(listeOb)
}
