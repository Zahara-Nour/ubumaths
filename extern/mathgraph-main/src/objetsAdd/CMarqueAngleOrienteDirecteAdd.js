/*
 * Created by yvesb on 10/10/2016.
 */
import { chaineNombre, ConvRadDeg, distancePointPoint, getStr, zeroAngle } from '../kernel/kernel'
import CMarqueAngleOrienteDirecte from '../objets/CMarqueAngleOrienteDirecte'
import Vect from '../types/Vect'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

CMarqueAngleOrienteDirecte.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo68') + ' ' + getStr('of') +
    ' ' + this.a.getName() + this.o.getName() + this.b.getName()
}

CMarqueAngleOrienteDirecte.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  else {
    let appsecteur
    const w = new Vect(this.centreX, this.centreY, xp, yp)
    const ang = w.angleRad()
    if (zeroAngle(Math.abs(this.ang2rad - this.ang1rad) - Math.PI)) {
      if (this.ang1rad < this.ang2rad) appsecteur = (ang >= this.ang1rad) && (ang <= this.ang2rad)
      else appsecteur = (ang >= this.ang1rad) || (ang <= this.ang2rad)
    } else {
      if (this.ang1rad <= this.ang2rad) appsecteur = (ang >= this.ang1rad) && (ang < this.ang2rad)
      else appsecteur = (ang >= this.ang1rad) || (ang <= this.ang2rad)
    }
    // Ici on ne peut pas appeler super.distancePoint car on appellerait la méthode
    // de CMarqueAngleOriente
    if (appsecteur) return Math.abs(distancePointPoint(this.centreX, this.centreY, xp, yp) - this.rayon)
    else return -1
  }
}

CMarqueAngleOrienteDirecte.prototype.tikzPath = function (dimf, bu) {
  const list = this.listeProprietaire
  const centreX = this.centreX
  const centreY = this.centreY
  const a = this.a
  const b = this.b
  const rayon = this.rayon
  const u = new Vect(centreX, centreY, a.x, a.y)
  let ang1 = u.angleRad()
  const u1 = new Vect()
  u.vecteurColineaire(rayon, u1)
  const x1 = list.tikzXcoord(centreX + u1.x, dimf, bu)
  const y1 = list.tikzYcoord(centreY + u1.y, dimf, bu)
  const ray = list.tikzLongueur(rayon, dimf, bu)
  const v = new Vect(centreX, centreY, b.x, b.y)
  const mesureAngle = u.mesureAngleVecteurs(v)
  let ang2 = ang1 + mesureAngle
  if (ang2 < 0) ang2 = ang2 + 2 * Math.PI
  if (ang2 >= 2 * Math.PI) ang2 = ang2 - 2 * Math.PI
  if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg

  return '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc ' +
    '(' + chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ')'
}
