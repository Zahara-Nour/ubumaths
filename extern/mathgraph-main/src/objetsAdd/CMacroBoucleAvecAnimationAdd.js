/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacroBoucleAvecAnimation from '../objets/CMacroBoucleAvecAnimation'
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
import MacBoucDlg from '../dialogs/MacBoucDlg'
export default CMacroBoucleAvecAnimation

CMacroBoucleAvecAnimation.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo130') + '\n' + getStr('chinfo133') +
    ' ' + this.variableAssociee.nomCalcul
}

CMacroBoucleAvecAnimation.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let resultat = false
  if (this.macroAvantBoucles !== null) { resultat |= this.macroAvantBoucles.depDe4Rec(p) }
  if (this.macroFinBoucle !== null) { resultat |= this.macroFinBoucle.depDe4Rec(p) }
  return this.memDep4Rec(resultat || CMacro.prototype.depDe4Rec.call(this, p))
}

CMacroBoucleAvecAnimation.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MacBoucDlg(app, this, true, callBack1, callBack2)
}

CMacroBoucleAvecAnimation.prototype.estDefiniParObjDs = function (listeOb) {
  return CMacro.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.variableAssociee.estDefPar(listeOb) &&
    this.macroAvantBoucles.estDefPar(listeOb) &&
    this.macroFinBoucle.estDefPar(listeOb)
}
