/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureAire from '../objets/CMesureAire'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CMesureAire

CMesureAire.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.polygoneAssocie.depDe4Rec(p) || this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p))
}

CMesureAire.prototype.utiliseLongueurUnite = function () {
  return true
}

CMesureAire.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo71') + ' ' + getStr('chinfo72') + ' ' + this.polygoneAssocie.nomSommetsPolygone()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.aire, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureAire.prototype.estDefiniParObjDs = function (listeOb) {
  return this.polygoneAssocie.estDefPar(listeOb)
}
