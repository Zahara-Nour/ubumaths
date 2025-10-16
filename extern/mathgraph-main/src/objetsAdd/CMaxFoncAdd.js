/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMaxFonc from '../objets/CMaxFonc'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import MaxMinDlg from '../dialogs/MaxMinDlg'
export default CMaxFonc

CMaxFonc.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.b.depDe4Rec(p) ||
    this.incertitude.depDe4Rec(p) || this.fonctionAssociee.depDe4Rec(p))
}

CMaxFonc.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + this.description() + ' ' + getStr('chinfo94') + ' ' + this.fonctionAssociee.getNom() + '\n' +
    getStr('chinfo100') + ' ' + this.a.chaineInfo() + ' ' + getStr('et') + ' ' + this.b.chaineInfo() + '\n' +
    getStr('chinfo102') + ' ' + this.incertitude.chaineInfo()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.valeur, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMaxFonc.prototype.description = function () {
  return getStr('chinfo176')
}

CMaxFonc.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMaxFonc.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MaxMinDlg(app, this, true, true, callBack1, callBack2)
}

CMaxFonc.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb) &&
  this.a.estDefiniParObjDs(listeOb) &&
  this.b.estDefiniParObjDs(listeOb) &&
  this.incertitude.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CMaxFonc.prototype.estConstantPourConst = function () {
  return this.a.estConstantPourConst() && this.b.estConstantPourConst() && this.incertitude.estConstantPourConst() && this.fonctionAssociee.estConstantPourConst()
}
