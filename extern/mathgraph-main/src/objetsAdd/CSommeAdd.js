/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSomme from '../objets/CSomme'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import SomProdDlg from '../dialogs/SomProdDlg'
export default CSomme

CSomme.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.indice.depDe4Rec(p) || this.valeur.depDe4Rec(p) || this.indiceMin.depDe4Rec(p) ||
    this.indiceMax.depDe4Rec(p))
}

CSomme.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('SomInd') + ' ' + getStr('chinfo115') + ' ' +
    this.valeur.getNom() + '\n' + getStr('chinfo116') + ' ' + this.indice.getNom() + '\n' +
    getStr('chinfo117') + ' ' + this.indiceMin.chaineInfo() + '\n' +
    getStr('chinfo118') + ' ' + this.indiceMax.chaineInfo()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.valeurSomme, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CSomme.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSomme.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SomProdDlg(app, this, true, true, callBack1, callBack2)
}

CSomme.prototype.estDefiniParObjDs = function (listeOb) {
  return this.indice.estDefPar(listeOb) &&
  this.valeur.estDefPar(listeOb) &&
  (this.indiceMin.estDefiniParObjDs(listeOb)) &&
  (this.indiceMax.estDefiniParObjDs(listeOb))
}
