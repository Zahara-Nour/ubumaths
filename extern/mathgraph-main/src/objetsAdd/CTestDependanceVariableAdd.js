/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTestDependanceVariable from '../objets/CTestDependanceVariable'
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import CCalculAncetre from '../objets/CCalculAncetre'
import TestDepVarDlg from '../dialogs/TestDepVarDlg'

export default CTestDependanceVariable

CTestDependanceVariable.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.fonctionAssociee.depDe4Rec(p))
}

CTestDependanceVariable.prototype.infoHist = function () {
  const chvar = this.fonctionAssociee.estDeNatureCalcul(NatCal.NFonctionReelle1Variable)
    ? this.fonctionAssociee.nomsVariables
    : this.fonctionAssociee.nomsVariables[this.indiceVariable]
  let ch = this.getNom() + ' : ' + getStr('ch192') + ' ' + this.fonctionAssociee.getNom() +
    '\n' + getStr('ch191') + ' ' + chvar +
    '\n' + getStr('chinfo97')
  if (this.resultat === 1) ch = ch + '1'; else ch = ch + '0'
  return ch
}

CTestDependanceVariable.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CTestDependanceVariable.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TestDepVarDlg(app, this, true, callBack1, callBack2)
}

CTestDependanceVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb)
}
