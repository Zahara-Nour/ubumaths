/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroBoucleAvecTrace from '../objets/CMacroBoucleAvecTrace'
import CMacroAvecListe from '../objets/CMacroAvecListe'
import { getStr } from '../kernel/kernel'
import MacBoucDlg from '../dialogs/MacBoucDlg'

export default CMacroBoucleAvecTrace

CMacroBoucleAvecTrace.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo130') + '\n' + getStr('chinfo133') +
    ' ' + this.variableAssociee.nomCalcul + ', ' + getStr('avecTraces')
}

CMacroBoucleAvecTrace.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let res = false
  if (this.macroAvantBoucles !== null) { res |= this.macroAvantBoucles.depDe4Rec(p) }
  if (this.macroFinBoucle !== null) { res |= this.macroFinBoucle.depDe4Rec(p) }
  return this.memDep4Rec(res || CMacroAvecListe.prototype.depDe4Rec.call(this, p))
}

CMacroBoucleAvecTrace.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacBoucDlg(app, this, true, callBack1, callBack2)
}
