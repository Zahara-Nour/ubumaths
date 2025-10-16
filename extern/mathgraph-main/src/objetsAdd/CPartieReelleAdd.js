/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CPartieReelle from '../objets/CPartieReelle'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'
export default CPartieReelle

CPartieReelle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.complexeAssocie.depDe4Rec(p))
}

CPartieReelle.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('PartieReelle') + ' ' + getStr('chinfo107') + ' ' + this.complexeAssocie.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.resultat, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CPartieReelle.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPartieReelle.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PartieReelleDlg(app, this, 1, true, callBack1, callBack2)
}

CPartieReelle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.complexeAssocie.estDefPar(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CPartieReelle.prototype.estConstantPourConst = function () {
  return this.complexeAssocie.estConstantPourConst()
}
