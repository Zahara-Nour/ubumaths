/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceDeuxLieux from '../objets/CSurfaceDeuxLieux'
import CSurface from '../objets/CSurface'
import { getStr } from '../kernel/kernel'
export default CSurfaceDeuxLieux

CSurfaceDeuxLieux.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo60') + ' ' + this.bord.getName() +
    ' ' + getStr('et') + ' ' + this.deuxiemeLieu.getName()
}

CSurfaceDeuxLieux.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSurface.prototype.depDe4Rec.call(this, p) ||
    this.deuxiemeLieu.depDe4Rec(p))
}

CSurfaceDeuxLieux.prototype.metAJourTableaux = function () {
  // + 4 car si on change les deux lieux en lieu fermé les lieux auront un point de plus
  this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + this.deuxiemeLieu.infoLieu.nombreDePoints + 4)
  this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + this.deuxiemeLieu.infoLieu.nombreDePoints + 4)
}

CSurfaceDeuxLieux.prototype.aPourBord = function (lieu) {
  return ((lieu === this.bord) || (lieu === this.deuxiemeLieu))
}

CSurfaceDeuxLieux.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist
  if (!this.existe || (masquage && this.masque)) return -1
  dist = this.bord.distancePointPourSurface(xp, yp, masquage, distmin)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.deuxiemeLieu.distancePointPourSurface(xp, yp, masquage, distmin)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segmentDebut.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segmentFin.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  return -1
}

CSurfaceDeuxLieux.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ind
  const ch1 = this.bord.tikzOnePath(dimf, nomaff, coefmult, bu)
  let ch2 = this.deuxiemeLieu.tikzOnePath(dimf, nomaff, coefmult, bu)
  let stb = ''
  // On inverse les coordonnées
  while ((ind = ch2.lastIndexOf('(')) !== -1) {
    const indv = ch2.lastIndexOf(',')
    const indparf = ch2.lastIndexOf(')')
    stb += '(' + ch2.substring(ind + 1, indv) + ',' + ch2.substring(indv + 1, indparf) + ')--'
    ch2 = ch2.substring(0, ind)
  }
  stb = stb.substring(0, stb.length - 2)
  return '\\fill' + this.tikzFillStyle() + ch1 + '--' + stb + '--cycle;'
}

CSurfaceDeuxLieux.prototype.estDefiniParObjDs = function (listeOb) {
  return CSurface.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.deuxiemeLieu.estDefPar(listeOb)
}
