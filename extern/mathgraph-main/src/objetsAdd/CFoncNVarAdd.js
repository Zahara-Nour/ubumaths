/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFoncNVar from '../objets/CFoncNVar'
import { getStr } from '../kernel/kernel'
import FonctionDlg from '../dialogs/FonctionDlg'
export default CFoncNVar

/**
 * Fonction renvoyant un tableau de chaîne de caractères représentant les noms des variables utilisée pour la fonction
 * @returns {string}
 */
CFoncNVar.prototype.getVariable = function () {
  return this.nomsVariables
}

CFoncNVar.prototype.info = function () {
  let ch = this.getNom() + '('
  for (let i = 0; i < this.nbVar; i++) {
    ch = ch + this.nomsVariables[i]
    if (i !== this.nbVar - 1) { ch = ch + ',' }
  }
  return ch + ')' + ' = ' + this.calcul.chaineCalculSansPar(this.variableFormelle())
}

CFoncNVar.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('Fonction') + ' ' + getStr('ch87') + '\n' + this.info()
  if (!this.existe) { ch = ch + '\n' + getStr('ch18') }
  return ch
}

CFoncNVar.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CFoncNVar.prototype.modifDlg = function (app, callBack1, callBack2) {
  new FonctionDlg(app, this, true, true, callBack1, callBack2)
}
