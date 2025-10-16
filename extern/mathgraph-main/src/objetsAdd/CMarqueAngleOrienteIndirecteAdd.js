/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import { chaineNombre, ConvRadDeg, distancePointPoint, getStr, zeroAngle } from '../kernel/kernel'
import CMarqueAngleOrienteIndirecte from '../objets/CMarqueAngleOrienteIndirecte'
export default CMarqueAngleOrienteIndirecte

CMarqueAngleOrienteIndirecte.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo69') + ' ' + getStr('of') +
    ' ' + this.a.nom + this.o.nom + this.b.nom
}

CMarqueAngleOrienteIndirecte.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else {
    let appsecteur
    const w = new Vect(this.centreX, this.centreY, xp, yp)
    const ang = w.angleRad()
    if (zeroAngle(Math.abs(this.ang2rad - this.ang1rad) - Math.PI)) {
      if (this.ang1rad < this.ang2rad) appsecteur = (ang >= this.ang2rad) || (ang <= this.ang1rad)
      else appsecteur = (ang >= this.ang2rad) && (ang <= this.ang1rad)
    } else {
      if (this.ang1rad <= this.ang2rad) appsecteur = (ang >= this.ang2rad) || (ang <= this.ang1rad)
      else appsecteur = (ang >= this.ang2rad) && (ang < this.ang1rad)
    }
    if (appsecteur) return Math.abs(distancePointPoint(this.centreX, this.centreY, xp, yp) - this.rayon)
    else return -1
  }
}

CMarqueAngleOrienteIndirecte.prototype.tikzPath = function (dimf, bu) {
  const list = this.listeProprietaire
  const centreX = this.centreX
  const centreY = this.centreY
  const b = this.b
  const rayon = this.rayon
  const u = new Vect(centreX, centreY, this.a.x, this.a.y)
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
  if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg
  return '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc (' +
    chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ')'
}
