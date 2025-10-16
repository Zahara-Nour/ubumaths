/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CMesureCoefDir from '../objets/CMesureCoefDir'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import ModifRepDlg from '../dialogs/ModifRepDlg'
export default CMesureCoefDir

CMesureCoefDir.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.rep.depDe4Rec(p) || this.d.depDe4Rec(p))
}

CMesureCoefDir.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo153') + ' ' + this.d.nom + '\n' + getStr('chinfo32') + ' ' +
  this.rep.getNom()
}

CMesureCoefDir.prototype.infoHist = function () {
  let ch = this.info()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.coef, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureCoefDir.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb) &&
  this.d.estDefPar(listeOb)
}

CMesureCoefDir.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMesureCoefDir.prototype.modifDlg = function (app, callBack1) {
  const self = this
  new ModifRepDlg(app, this, this.rep, 'MesCoefDir', function (rep) {
    self.rep = rep
    if (callBack1 !== null) callBack1()
  })
}
