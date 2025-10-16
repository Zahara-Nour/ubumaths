/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CObjetDuplique from '../objets/CObjetDuplique'
import CElementGraphique from '../objets/CElementGraphique'
import { getStr } from '../kernel/kernel'

export default CObjetDuplique

CObjetDuplique.prototype.infoHist = function () {
  return getStr('chinfo233') + ' ' + this.elementDuplique.getNom()
}

CObjetDuplique.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementGraphique.prototype.depDe4Rec.call(this, p) ||
    this.elementDuplique.depDe4Rec(p))
}

CObjetDuplique.prototype.distancePointPourSurface = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else return this.elementDuplique.distancePointPourSurface(xp, yp, masquage)
}
CObjetDuplique.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  const masquageElementCache = this.elementDuplique.masque
  if (this.masque) this.elementDuplique.cache()
  else this.elementDuplique.montre()
  const resul = this.elementDuplique.distancePoint(xp, yp, masquage, distmin)
  this.elementDuplique.masque = masquageElementCache
  return resul
}

CObjetDuplique.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  return this.elementDuplique.tikz(dimf, nomaff, coefmult, bu)
}

CObjetDuplique.prototype.estDefiniParObjDs = function (listeOb) {
  return this.elementDuplique.estDefPar(listeOb)
}
