/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalcMat from '../objets/CCalcMat'
import CalcMatDlg from '../dialogs/CalcMatDlg'
import { chaineNombre, getStr } from '../kernel/kernel'
export default CCalcMat

CCalcMat.prototype.info = function () {
  return this.getNom() + ' = ' + this.calcul.chaineCalculSansPar()
}

CCalcMat.prototype.infoHist = function () {
  let ch = this.info() + '\n' + getStr('CalculMat')
  const resultat = this.resultat
  if (this.existe) {
    if (typeof resultat === 'number') {
      ch += '\n' + getStr('Matrice') + ' 1x1'
      ch += '\n' + chaineNombre(resultat, 12)
    } else {
      const size = resultat.size()
      const n = size[0]
      const p = size[1]
      ch += '\n' + getStr('Matrice') + ' ' + n + 'x' + p
      for (let i = 0; i < n; i++) {
        ch += '\n'
        for (let j = 0; j < p; j++) {
          if (j !== 0) ch += '   '
          const nb = resultat.get([i, j])
          ch += (nb >= 0 ? '  ' : '') + chaineNombre(nb, 12)
        }
      }
    }
  } else ch = ch + '\n' + getStr('ch18')
  return ch
}

CCalcMat.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CCalcMat.prototype.modifDlg = function (app, callBack1, callBack2) {
  new CalcMatDlg(app, this, true, callBack1, callBack2)
}
