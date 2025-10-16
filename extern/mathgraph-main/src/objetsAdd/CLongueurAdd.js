/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLongueur from '../objets/CLongueur'
import { chaineNombre, getStr } from '../kernel/kernel'
import CValDyn from '../objets/CValDyn'
export default CLongueur

CLongueur.prototype.utiliseLongueurUnite = function () {
  return true
}

CLongueur.prototype.info = function () {
  return getStr('chinfo73') + ' ' + this.point1.getName() + this.point2.getName()
}

CLongueur.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  const resultat = CValDyn.prototype.depDe4Rec.call(this, p) || this.point1.depDe4Rec(p) || this.point2.depDe4Rec(p)
  if ((this.listeProprietaire.pointeurLongueurUnite === this) ||
    this.listeProprietaire.pointeurLongueurUnite === null) { return this.memDep4Rec(resultat) } else return this.memDep4Rec(resultat || (this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p)))
}

CLongueur.prototype.infoHist = function () {
  let ch = getStr('chinfo17') + ' ' + this.point1.nom + this.point2.nom
  if (this === this.listeProprietaire.pointeurLongueurUnite) ch = ch + '\n' + getStr('ch34')
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.longueur, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CLongueur.prototype.estDefiniParObjDs = function (listeOb) {
  return this.point1.estDefPar(listeOb) &&
  this.point2.estDefPar(listeOb)
}
