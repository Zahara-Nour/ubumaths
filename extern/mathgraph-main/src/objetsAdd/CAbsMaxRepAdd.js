/*
 * Created by yvesb on 19/04/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAbsMaxRep from '../objets/CAbsMaxRep'
import { chaineNombre, getStr } from '../kernel/kernel'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import COrdonneeOrigineRep from '../objets/COrdonneeOrigineRep'

export default CAbsMaxRep

CAbsMaxRep.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('AbsMaxRep') + ' ' + this.rep.getNom()
}

CAbsMaxRep.prototype.infoHist = function () {
  let ch = this.nomCalcul + ' : ' + getStr('AbsMaxRep') + ' ' + this.rep.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.value, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CAbsMaxRep.prototype.genereNom = function () {
  COrdonneeOrigineRep.ind++
  return 'absMax' + CAbsMaxRep.ind
}

CAbsMaxRep.prototype.modifDlg = function (app, callBack1, callBack2) {
  new InfoRepDlg(app, this, 5, true, callBack1, callBack2)
}
