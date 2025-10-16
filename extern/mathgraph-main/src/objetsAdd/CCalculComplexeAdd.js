/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalculComplexe from '../objets/CCalculComplexe'
import { getStr } from '../kernel/kernel'
import CalculDlg from '../dialogs/CalculDlg'
export default CCalculComplexe

CCalculComplexe.prototype.info = function () {
  return this.getNom() + ' = ' + this.calcul.chaineCalculSansPar() + ' (' + getStr('CalculComp') + ')'
}

CCalculComplexe.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('CalculComp') + '\n' + this.getNom() + ' = ' + this.calcul.chaineCalculSansPar()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + this.rendChaineValeurComplexe(12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CCalculComplexe.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CCalculComplexe.prototype.modifDlg = function (app, callBack1, callBack2) {
  new CalculDlg(app, this, true, false, callBack1, callBack2)
}
