/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFonc from '../objets/CFonc'
import { getStr } from '../kernel/kernel'
import FonctionDlg from '../dialogs/FonctionDlg'
export default CFonc

CFonc.prototype.info = function () {
  return this.getNom() + '(' + this.nomsVariables + ')' + ' = ' + this.calcul.chaineCalculSansPar(this.variableFormelle())
}

CFonc.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('Fonction') + ' ' + getStr('ch87') + '\n' + this.info()
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  return ch
}

CFonc.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CFonc.prototype.modifDlg = function (app, callBack1, callBack2) {
  new FonctionDlg(app, this, true, true, callBack1, callBack2)
}
