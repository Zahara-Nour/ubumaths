/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceDisque from '../objets/CSurfaceDisque'
import { chaineNombre } from '../kernel/kernel'
export default CSurfaceDisque

CSurfaceDisque.prototype.peutGenererLieuObjet = function () {
  return true
}

CSurfaceDisque.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  return this.cercle.distancePointPourSurface(xp, yp, masquage)
}

CSurfaceDisque.prototype.coincideAvec = function (p) {
  if (p.className !== 'CSurfaceDisque') return false
  return this.cercle.coincideAvec(p.cercle)
}

CSurfaceDisque.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  const cercle = this.cercle
  const x1 = list.tikzXcoord(cercle.centreX, dimf, bu)
  const y1 = list.tikzYcoord(cercle.centreY, dimf, bu)
  const ray = list.tikzLongueur(cercle.rayon, dimf, bu)
  return '\\fill ' + this.tikzFillStyle() + '(' + chaineNombre(x1, 3) + ',' +
    chaineNombre(y1, 3) + ') circle ' + '(' + chaineNombre(ray, 3) + ');'
}
