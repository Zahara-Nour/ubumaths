/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CProduitScalaire from '../objets/CProduitScalaire'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CProduitScalaire

CProduitScalaire.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.vect1.depDe4Rec(p) || this.vect2.depDe4Rec(p) ||
    this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p))
}

CProduitScalaire.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo157') + ' ' + this.vect1.point1.getName() + this.vect1.point2.getName()
}

CProduitScalaire.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo157') + ' ' + this.vect1.point1.nom + this.vect1.point2.nom + '\n' +
    getStr('chinfo158') + ' ' + this.vect2.point1.nom + this.vect2.point2.nom
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.prosca, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CProduitScalaire.prototype.estDefiniParObjDs = function (listeOb) {
  return this.vect1.estDefPar(listeOb) &&
  this.vect2.estDefPar(listeOb)
}
