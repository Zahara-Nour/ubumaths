/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureY from '../objets/CMesureY'
import { chaineNombre, getStr } from '../kernel/kernel'
import ModifRepDlg from '../dialogs/ModifRepDlg'
export default CMesureY

CMesureY.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo81') + ' ' + this.pointMesure.getName() + '\n' + getStr('chinfo32') +
    ' ' + this.repereAssocie.getNom()
}

CMesureY.prototype.infoHist = function () {
  let ch = this.info()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.abscisse, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureY.prototype.modifDlg = function (app, callBack1) {
  const self = this
  new ModifRepDlg(app, this, this.repereAssocie, 'MesOrdRep', function (rep) {
    self.repereAssocie = rep
    if (callBack1 !== null) callBack1()
  })
}
