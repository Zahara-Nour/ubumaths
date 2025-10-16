/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroAffectationPointLie from '../objets/CMacroAffectationPointLie'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacAffPtLieDlg from '../dialogs/MacAffPtLieDlg'

export default CMacroAffectationPointLie

CMacroAffectationPointLie.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo126') + ' ' + this.pointLieAPositionner.getName() + ' ' +
    getStr('chinfo230') + ' ' + this.pointLieAssocie.getName()
}

CMacroAffectationPointLie.prototype.estGenereParPointLie = function (pointlie) {
  return ((this.pointLieAssocie === pointlie) || (this.pointLieAPositionner === pointlie))
}

CMacroAffectationPointLie.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMacro.prototype.depDe4Rec.call(this, p) ||
    this.pointLieAPositionner.depDe4Rec(p) || this.pointLieAssocie.depDe4Rec(p))
}

CMacroAffectationPointLie.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacAffPtLieDlg(app, this, true, callBack1, callBack2)
}

CMacroAffectationPointLie.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.pointLieAssocie.estDefPar(listeOb) &&
    this.pointLieAPositionner.estDefPar(listeOb)
}
