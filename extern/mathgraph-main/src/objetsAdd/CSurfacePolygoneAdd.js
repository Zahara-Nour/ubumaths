/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfacePolygone from '../objets/CSurfacePolygone'
import { chaineNombre, getStr } from '../kernel/kernel'
export default CSurfacePolygone

CSurfacePolygone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo60') + ' ' + this.bord.getNom()
}

CSurfacePolygone.prototype.peutGenererLieuObjet = function () {
  return true
}

CSurfacePolygone.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  return this.polygone.distancePointPourSurface(xp, yp, masquage)
}

CSurfacePolygone.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let i; let x; let y; let ch
  const list = this.listeProprietaire
  const polygone = this.polygone
  ch = '\\fill ' + this.tikzFillStyle() + '('
  for (i = 0; i < polygone.nombrePoints - 1; i++) {
    x = list.tikzXcoord(polygone.absPoints[i], dimf, bu)
    y = list.tikzYcoord(polygone.ordPoints[i], dimf, bu)
    ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ')--('
  }
  i = polygone.nombrePoints - 1
  x = list.tikzXcoord(polygone.absPoints[i], dimf, bu)
  y = list.tikzYcoord(polygone.ordPoints[i], dimf, bu)
  ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ')--cycle;'
  return ch
}
