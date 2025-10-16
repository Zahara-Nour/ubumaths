/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureX from '../objets/CMesureX'
import { chaineNombre, getStr } from '../kernel/kernel'
import CValDyn from '../objets/CValDyn'
import ModifRepDlg from '../dialogs/ModifRepDlg'
export default CMesureX

CMesureX.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CValDyn.prototype.depDe4Rec.call(this, p) ||
    this.repereAssocie.depDe4Rec(p) || this.pointMesure.depDe4Rec(p))
}

CMesureX.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo31') + ' ' + this.pointMesure.getName() + '\n' + getStr('chinfo32') +
    ' ' + this.repereAssocie.getNom()
}

CMesureX.prototype.infoHist = function () {
  let ch = this.info()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.abscisse, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureX.prototype.estDefiniParObjDs = function (listeOb) {
  return this.repereAssocie.estDefPar(listeOb) &&
  this.pointMesure.estDefPar(listeOb)
}

CMesureX.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMesureX.prototype.modifDlg = function (app, callBack1) {
  const self = this
  new ModifRepDlg(app, this, this.repereAssocie, 'MesAbsRep', function (rep) {
    self.repereAssocie = rep
    if (callBack1 !== null) callBack1()
  })
}
