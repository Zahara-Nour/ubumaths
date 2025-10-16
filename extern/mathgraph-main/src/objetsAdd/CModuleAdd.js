/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CModule from '../objets/CModule'
import { chaineNombre, getStr } from '../kernel/kernel'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default CModule

CModule.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo112') + ' ' + getStr('chinfo107') + ' ' + this.complexeAssocie.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.resultat, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CModule.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PartieReelleDlg(app, this, 3, true, callBack1, callBack2)
}
