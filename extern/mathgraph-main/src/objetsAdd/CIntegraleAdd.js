/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CIntegrale from '../objets/CIntegrale'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import IntegraleDlg from '../dialogs/IntegraleDlg'
export default CIntegrale

CIntegrale.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('chinfo93') + ' ' + getStr('of') + ' ' + this.fonctionAssociee.getNom()
}

CIntegrale.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo93') + ' ' + getStr('of') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('chinfo95') + ' ' + this.a.chaineInfo() + '\n' + getStr('chinfo96') + ' ' + this.b.chaineInfo()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.valeurIntegrale, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CIntegrale.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CIntegrale.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.b.depDe4Rec(p) || this.n.depDe4Rec(p) || this.fonctionAssociee.depDe4Rec(p))
}

CIntegrale.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CIntegrale.prototype.modifDlg = function (app, callBack1, callBack2) {
  new IntegraleDlg(app, this, true, callBack1, callBack2)
}

CIntegrale.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb) &&
  (this.a.estDefiniParObjDs(listeOb)) &&
  (this.b.estDefiniParObjDs(listeOb))
}

// Ajout version 7.0
CIntegrale.prototype.estConstantPourConst = function () {
  return false
}
