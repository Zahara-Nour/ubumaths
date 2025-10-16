/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroTraceAuto from '../objets/CMacroTraceAuto'
import CMacroAvecListe from '../objets/CMacroAvecListe'
import { getStr } from '../kernel/kernel'
import MacTraceAutoDlg from '../dialogs/MacTraceAutoDlg'
export default CMacroTraceAuto

CMacroTraceAuto.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo136') + ' ' + this.pointLieAssocie.getName()
}

CMacroTraceAuto.prototype.estGenereParPointLie = function (pointlie) {
  return this.pointLieAssocie === pointlie
}

CMacroTraceAuto.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacroAvecListe.prototype.depDe4Rec.call(this, p) ||
    this.pointLieAssocie.depDe4Rec(p))
}

CMacroTraceAuto.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacTraceAutoDlg(app, this, true, callBack1, callBack2)
}

CMacroTraceAuto.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacroAvecListe.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.pointLieAssocie.estDefPar(listeOb)
}
