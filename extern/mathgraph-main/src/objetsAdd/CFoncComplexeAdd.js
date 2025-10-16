/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFoncComplexe from '../objets/CFoncComplexe'
import { getStr } from '../kernel/kernel'
import FonctionDlg from '../dialogs/FonctionDlg'
export default CFoncComplexe

CFoncComplexe.prototype.info = function () {
  return this.getNom() + '(' + this.nomsVariables + ')' + ' = ' +
    this.calcul.chaineCalculSansPar(this.variableFormelle()) + ' (' + getStr('FoncComp') + ')'
}
CFoncComplexe.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('FoncComp') + ' ' + getStr('ch87') + '\n' + this.info()
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  return ch
}

CFoncComplexe.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CFoncComplexe.prototype.modifDlg = function (app, callBack1, callBack2) {
  new FonctionDlg(app, this, true, false, callBack1, callBack2)
}
