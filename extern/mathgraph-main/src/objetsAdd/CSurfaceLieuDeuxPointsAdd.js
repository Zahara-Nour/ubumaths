/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceLieuDeuxPoints from '../objets/CSurfaceLieuDeuxPoints'
import CSurface from '../objets/CSurface'
import { chaineNombre, getStr } from '../kernel/kernel'
export default CSurfaceLieuDeuxPoints

CSurfaceLieuDeuxPoints.infoHist = function () {
  return getStr('chinfo60') + ' ' + this.bord.getName() + ', ' +
    this.point1.getName() + ' ' + getStr('et') + ' ' + this.point2.getName()
}

CSurfaceLieuDeuxPoints.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSurface.prototype.depDe4Rec.call(this, p) ||
    this.point1.depDe4Rec(p) || this.point2.depDe4Rec(p))
}

CSurfaceLieuDeuxPoints.prototype.metAJourTableaux = function () {
  // + 3 et non +2 car si le lieu est transformé en un lieu fermé il aura un point de plus
  this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 3)
  this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 3)
}

CSurfaceLieuDeuxPoints.prototype.aPourBord = function (lieu) {
  return (lieu === this.bord)
}

CSurfaceLieuDeuxPoints.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist
  if (!this.existe || (masquage && this.masque)) return -1
  dist = this.bord.distancePointPourSurface(xp, yp, masquage, distmin)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segmentDebut.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segmentDroite.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segmentFin.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  return -1
}

CSurfaceLieuDeuxPoints.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  return '\\fill' + this.tikzFillStyle() + this.bord.tikzOnePath(dimf, nomaff, coefmult, bu) + ' -- (' +
    chaineNombre(list.tikzXcoord(this.x3, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(this.y3, dimf, bu), 3) + ')--(' +
    chaineNombre(list.tikzXcoord(this.x2, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(this.y2, dimf, bu), 3) + ')--cycle;'
}

CSurfaceLieuDeuxPoints.prototype.estDefiniParObjDs = function (listeOb) {
  return CSurface.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.point1.estDefPar(listeOb) &&
  this.point2.estDefPar(listeOb)
}
