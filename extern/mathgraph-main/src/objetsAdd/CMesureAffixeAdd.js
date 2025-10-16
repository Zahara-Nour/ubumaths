/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureAffixe from '../objets/CMesureAffixe'
import CCalculAncetre from '../objets/CCalculAncetre'
import { getStr } from '../kernel/kernel'
import ModifRepDlg from '../dialogs/ModifRepDlg'
export default CMesureAffixe

CMesureAffixe.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.repereAssocie.depDe4Rec(p) || this.pointMesure.depDe4Rec(p))
}

CMesureAffixe.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo108') + ' ' + getStr('chinfo109') +
    '  ' + this.pointMesure.getName() + '\n' + getStr('chinfo110') + ' ' + this.repereAssocie.getNom()
}

CMesureAffixe.prototype.infoHist = function () {
  let ch = this.info()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + this.affixe.chaineValeurComplexe(8)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureAffixe.prototype.estDefiniParObjDs = function (listeOb) {
  return this.repereAssocie.estDefPar(listeOb) &&
  this.pointMesure.estDefPar(listeOb)
}

CMesureAffixe.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMesureAffixe.prototype.modifDlg = function (app, callBack1) {
  const self = this
  new ModifRepDlg(app, this, this.repereAssocie, 'MesAffRep', function (rep) {
    self.repereAssocie = rep
    if (callBack1 !== null) callBack1()
  })
}
