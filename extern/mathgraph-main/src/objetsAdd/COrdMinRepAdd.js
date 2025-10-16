/*
 * Created by yvesb on 19/04/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import COrdMinRep from '../objets/COrdMinRep'
import { chaineNombre, getStr } from '../kernel/kernel'
import InfoRepDlg from '../dialogs/InfoRepDlg'

export default COrdMinRep

COrdMinRep.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('OrdMinRep') + ' ' + this.rep.getNom()
}

COrdMinRep.prototype.infoHist = function () {
  let ch = this.nomCalcul + ' : ' + getStr('OrdMinRep') + ' ' + this.rep.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.value, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

COrdMinRep.prototype.genereNom = function () {
  COrdMinRep.ind++
  return 'ordMin' + COrdMinRep.ind
}

COrdMinRep.prototype.modifDlg = function (app, callBack1, callBack2) {
  new InfoRepDlg(app, this, 6, true, callBack1, callBack2)
}
