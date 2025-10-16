/*
 * Created by yvesb on 28/11/2024.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceArc from '../objets/CSurfaceArc'
import { chaineNombre, ConvRadDeg, getStr, mesurePrincipale } from '../kernel/kernel'
import Vect from '../types/Vect'
import NatArc from '../types/NatArc'
export default CSurfaceArc

CSurfaceArc.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('SurfaceArc') + ' : ' + this.bord.getNom()
}

CSurfaceArc.prototype.peutGenererLieuObjet = function () {
  return true
}

CSurfaceArc.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  if (!this.existe || (masquage && this.masque)) return -1
  let dist = this.arc.distancePointPourSurface(xp, yp, masquage, distmin)
  if ((dist !== -1) && (dist < distmin)) return dist
  dist = this.segment.distancePoint(xp, yp, masquage)
  if ((dist !== -1) && (dist < distmin)) return dist
  return -1
}

CSurfaceArc.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ang1; let ang2; let dif
  const list = this.listeProprietaire
  const arc = this.arc
  const x1 = list.tikzXcoord(arc.origine_x, dimf, bu)
  const y1 = list.tikzYcoord(arc.origine_y, dimf, bu)
  const ray = list.tikzLongueur(arc.rayon, dimf, bu)
  const u = new Vect(arc.centreX, arc.centreY, arc.origine_x, arc.origine_y)
  ang1 = u.angleRad()
  ang2 = ang1 + arc.valeurAngleAuCentre
  if (ang2 < 0) ang2 = ang2 + 2 * Math.PI
  if (ang2 >= 2 * Math.PI) ang2 = ang2 - 2 * Math.PI
  switch (this.bord.natureArc()) {
    case NatArc.PetitArc :
      dif = mesurePrincipale(ang2 - ang1)
      if (dif > 0) {
        if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
      } else {
        if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
      }
      break
    case NatArc.GrandArc :
      dif = mesurePrincipale(ang2 - ang1)
      if (dif > 0) {
        if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
      } else {
        if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
      }
      break
    case NatArc.ArcDirect :
      if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
      break
    case NatArc.ArcIndirect :
      if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
      break
  }
  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg
  return '\\fill ' + this.tikzFillStyle() + '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc ' +
    '(' + chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ')--cycle;'
}
