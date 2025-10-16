/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceLieuDroite from '../objets/CSurfaceLieuDroite'
import CSurface from '../objets/CSurface'
import { chaineNombre, getStr } from '../kernel/kernel'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CSurfaceLieuDroite

CSurfaceLieuDroite.prototype.infoHist = function () {
  return this.nom + ' : ' + getStr('chinfo60') + ' ' + this.bord.getName() + ' ' + getStr('et') +
    ' ' + this.droiteAssociee.getNom()
}

CSurfaceLieuDroite.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSurface.prototype.depDe4Rec.call(this, p) ||
    this.droiteAssociee.depDe4Rec(p))
}

CSurfaceLieuDroite.prototype.metAJourTableaux = function () {
  // + 4 et non +3 car si le lieu est changé en lieu fermé, un point de plus sera rajouté au lieu
  this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 4)
  this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 4)
}

CSurfaceLieuDroite.prototype.aPourBord = function (lieu) {
  return (lieu === this.bord)
}

CSurfaceLieuDroite.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist
  if (!this.existe || (masquage && this.masque)) return -1
  else {
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
}

CSurfaceLieuDroite.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const bord = this.bord
  const list = this.listeProprietaire
  const droiteAssociee = this.droiteAssociee
  const point2 = this.point2
  const point3 = this.point3
  // On recopie les coordonnées des points du lieu
  const indicePremierPoint = bord.infoLignes[bord.indicePremiereLigne].indicePremierPoint
  const indiceDernierPoint = bord.infoLignes[bord.indicePremiereLigne].indicePremierPoint +
    this.nbPointsLigne - 1
  const x1 = bord.xCoord[indicePremierPoint]
  const y1 = bord.yCoord[indicePremierPoint]
  projetteOrtho(x1, y1, droiteAssociee.point_x, droiteAssociee.point_y, droiteAssociee.vect, point2)
  const x4 = bord.xCoord[indiceDernierPoint]
  const y4 = bord.yCoord[indiceDernierPoint]
  projetteOrtho(x4, y4, droiteAssociee.point_x, droiteAssociee.point_y, droiteAssociee.vect, point3)
  return '\\fill' + this.tikzFillStyle() + this.bord.tikzOnePath(dimf, nomaff, coefmult, bu) + ' -- (' +
    chaineNombre(list.tikzXcoord(point3.x, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(point3.y, dimf, bu), 3) + ')--(' +
    chaineNombre(list.tikzXcoord(point2.x, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(point2.y, dimf, bu), 3) + ')--cycle;'
}

CSurfaceLieuDroite.prototype.estDefiniParObjDs = function (listeOb) {
  return CSurface.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.droiteAssociee.estDefPar(listeOb)
}
