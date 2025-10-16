/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CPartieImaginaire from '../objets/CPartieImaginaire'
import { chaineNombre, getStr } from '../kernel/kernel'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default CPartieImaginaire

CPartieImaginaire.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('PartieImaginaire') + ' ' + getStr('chinfo107') + ' ' + this.complexeAssocie.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.resultat, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CPartieImaginaire.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PartieReelleDlg(app, this, 2, true, callBack1, callBack2)
}
