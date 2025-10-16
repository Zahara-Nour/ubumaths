/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTestFact from '../objets/CTestFact'
import { chaineNombre, getStr } from '../kernel/kernel'
import TestEqFactDlg from '../dialogs/TestEqFactDlg'
export default CTestFact

CTestFact.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('ch200') + '\n' + this.calcul1.getNom() + ' ' + getStr('par') +
    ' ' + this.calcul2.getNom() + '\n'
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

CTestFact.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CTestFact.prototype.modifDlg = function (app, callBack1, callBack2) {
  new TestEqFactDlg(app, this, true, false, callBack1, callBack2)
}
