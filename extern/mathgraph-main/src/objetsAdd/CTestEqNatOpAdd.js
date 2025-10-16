/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTestEqNatOp from '../objets/CTestEqNatOp'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import TestEqNatOpDlg from '../dialogs/TestEqNatOpDlg'
export default CTestEqNatOp

CTestEqNatOp.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.calcul1.depDe4Rec(p) || this.calcul2.depDe4Rec(p))
}

CTestEqNatOp.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('ch196') + ' ' + getStr('of') + ' ' +
    this.calcul1.getNom() + ' ' + getStr('chinfo194') + ' ' + this.calcul2.getNom() +
    '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.resultat, 12)
}

CTestEqNatOp.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CTestEqNatOp.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TestEqNatOpDlg(app, this, true, callBack1, callBack2)
}

CTestEqNatOp.prototype.estDefiniParObjDs = function (listeOb) {
  return this.calcul1.estDefPar(listeOb) &&
  this.calcul2.estDefPar(listeOb)
}
