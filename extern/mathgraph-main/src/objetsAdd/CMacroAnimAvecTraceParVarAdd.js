/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAnimAvecTraceParVar from '../objets/CMacroAnimAvecTraceParVar'
import CMacroAvecListe from '../objets/CMacroAvecListe'
import { getStr } from '../kernel/kernel'
import MacAnimParVarDlg from 'src/dialogs/MacAnimParVarDlg'
export default CMacroAnimAvecTraceParVar

CMacroAnimAvecTraceParVar.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo124') + ' ' +
    this.variableAssociee.nomCalcul + ', ' + getStr('avecTraces')
}

CMacroAnimAvecTraceParVar.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacroAvecListe.prototype.depDe4Rec.call(this, p) ||
    this.variableAssociee.depDe4Rec(p))
}

CMacroAnimAvecTraceParVar.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacAnimParVarDlg(app, true, this, true, callBack1, callBack2)
}

CMacroAnimAvecTraceParVar.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacroAvecListe.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.variableAssociee.estDefPar(listeOb)
}
