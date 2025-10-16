/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceLieu from '../objets/CSurfaceLieu'
export default CSurfaceLieu

CSurfaceLieu.prototype.metAJourTableaux = function () {
  this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 1)
  this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 1)
}

CSurfaceLieu.prototype.aPourBord = function (lieu) {
  return (lieu === this.bord)
}

CSurfaceLieu.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  if (!this.existe || (masquage && this.masque)) return -1
  return this.bord.distancePointPourSurface(xp, yp, masquage, distmin)
}

CSurfaceLieu.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  return '\\fill' + this.tikzFillStyle() + this.bord.tikzOnePath(dimf, nomaff, coefmult, bu) + ';'
}
