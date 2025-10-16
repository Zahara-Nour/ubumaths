/*
 * Created by yvesb on 19/04/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import COrdMaxRep from '../objets/COrdMaxRep'
import { chaineNombre, getStr } from '../kernel/kernel'
import InfoRepDlg from '../dialogs/InfoRepDlg'

export default COrdMaxRep

COrdMaxRep.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('OrdMaxRep') + ' ' + this.rep.getNom()
}

COrdMaxRep.prototype.infoHist = function () {
  let ch = this.nomCalcul + ' : ' + getStr('OrdMaxRep') + ' ' + this.rep.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.value, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

COrdMaxRep.prototype.genereNom = function () {
  COrdMaxRep.ind++
  return 'ordMax' + COrdMaxRep.ind
}

COrdMaxRep.prototype.modifDlg = function (app, callBack1, callBack2) {
  new InfoRepDlg(app, this, 7, true, callBack1, callBack2)
}
