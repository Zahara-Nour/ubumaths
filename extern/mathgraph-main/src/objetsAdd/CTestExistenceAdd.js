/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTestExistence from '../objets/CTestExistence'
import { getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import TestExistenceDlg from '../dialogs/TestExistenceDlg'
export default CTestExistence

CTestExistence.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.valeurAssociee.depDe4Rec(p))
}

CTestExistence.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('TestExistence') + '\n' + getStr('chinfo92') + ' ' + this.valeurAssociee.getNom() +
    '\n' + getStr('chinfo97')
  if (this.valeurAssociee.existe) ch = ch + '1'; else ch = ch + '0'
  return ch
}

CTestExistence.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CTestExistence.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TestExistenceDlg(app, this, true, callBack1, callBack2)
}

CTestExistence.prototype.estDefiniParObjDs = function (listeOb) {
  return this.valeurAssociee.estDefPar(listeOb)
}
