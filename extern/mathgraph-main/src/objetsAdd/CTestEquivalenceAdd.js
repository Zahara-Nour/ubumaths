/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTestEquivalence from '../objets/CTestEquivalence'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import TestFactDlg from '../dialogs/TestEqFactDlg'

export default CTestEquivalence

CTestEquivalence.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.calcul1.depDe4Rec(p) || this.calcul2.depDe4Rec(p) || this.test.depDe4Rec(p))
}

CTestEquivalence.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('ch186') + '\n' + this.calcul1.getNom() + ' ' +
    getStr('et') + ' ' + this.calcul2.getNom() + '\n'
  ch += this.calcul1.getNom() + ' : ' + (this.remplacementValeurs1 ? getStr('ch187') : getStr('ch188'))
  ch += ' ' + getStr('ch189') + '\n'
  ch += this.calcul1.getNom() + ' : ' + (this.eliminMultUn1 ? getStr('ch187') : getStr('ch188'))
  ch += ' ' + getStr('SupMul1') + '\n'
  ch += this.calcul2.getNom() + ' : ' + (this.remplacementValeurs2 ? getStr('ch187') : getStr('ch188'))
  ch += ' ' + getStr('ch189') + '\n'
  ch += this.calcul2.getNom() + ' : ' + (this.eliminMultUn2 ? getStr('ch187') : getStr('ch188'))
  ch += getStr('SupMul1') + '\n'
  ch += getStr('testEquivalenceDlg4') + ' ' + this.test.chaineInfo() + '\n'
  if (this.equivalenceDecimalFracIrr) ch += getStr('EqDecFr') + '\n'
  ch = ch + getStr('chinfo97') + ' ' + chaineNombre(this.resultat, 12)
  return ch
}

CTestEquivalence.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CTestEquivalence.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TestFactDlg(app, this, true, true, callBack1, callBack2)
}

CTestEquivalence.prototype.estDefiniParObjDs = function (listeOb) {
  return this.calcul1.estDefPar(listeOb) &&
  this.calcul2.estDefPar(listeOb)
}
