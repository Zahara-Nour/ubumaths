/*
 * Created by yvesb on 10/10/2016.
 */
import Vect from '../types/Vect'
import { chaineNombre, ConvRadDeg, distancePointPoint, getStr, mesurePrincipale, testAngleDroit, zeroAngle } from '../kernel/kernel'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import CMarqueAngleAncetre from '../objets/CMarqueAngleAncetre'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import { appartientSegment, projetteOrtho } from 'src/kernel/kernelVect'

export default CMarqueAngleGeometrique
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

CMarqueAngleGeometrique.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo66') + ' ' + getStr('of') + ' ' +
    this.a.getName() + this.o.getName() + this.b.getName()
}

CMarqueAngleGeometrique.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMarqueAngleAncetre.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.o.depDe4Rec(p) || this.b.depDe4Rec(p))
}

CMarqueAngleGeometrique.prototype.distancePoint = function (xp, yp, masquage) {
  let appsecteur, w, ang, ang1radaux, ang2radaux, dif, proj
  if (!this.existe || (masquage && this.masque)) return -1
  else {
    w = new Vect(this.centreX, this.centreY, xp, yp)
    ang = w.angleRad()
    ang1radaux = Math.min(this.ang1rad, this.ang2rad)
    ang2radaux = Math.max(this.ang1rad, this.ang2rad)
    dif = ang2radaux - ang1radaux
    if (zeroAngle(dif - Math.PI)) {
      if (this.ang1rad < this.ang2rad) appsecteur = (ang >= this.ang1rad) && (ang <= this.ang2rad)
      else appsecteur = (ang >= this.ang1rad) || (ang <= this.ang2rad)
    } else {
      if (dif <= Math.PI) appsecteur = (ang >= ang1radaux) && (ang < ang2radaux)
      else appsecteur = (ang <= ang1radaux) || (ang >= ang2radaux)
    }
    if (!(appsecteur)) return -1
    if (testAngleDroit(this.ang1rad, this.ang2rad)) {
      proj = { x: 0, y: 0 }
      projetteOrtho(xp, yp, this.pointc.x, this.pointc.y, this.u, proj)
      if (appartientSegment(proj.x, proj.y, this.point1.x, this.point1.y, this.pointc.x, this.pointc.y)) { return distancePointPoint(xp, yp, proj.x, proj.y) } else {
        projetteOrtho(xp, yp, this.pointc.x, this.pointc.y, this.v, proj)
        if (appartientSegment(proj.x, proj.y, this.point2.x, this.point2.y, this.pointc.x, this.pointc.y)) { return distancePointPoint(xp, yp, proj.x, proj.y) } else return -1
      }
    } else return Math.abs(distancePointPoint(this.centreX, this.centreY, xp, yp) - this.rayon)
  }
}

CMarqueAngleGeometrique.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  // var styleTrait = this.masque ? StyleTrait.traitPointille : this.style // Modifié version 6.4.1
  const styleMarque = this.styleMarque
  const marqueSegment = this.marqueSegment

  if (this.angleDroit) {
    if ((styleMarque & StyleMarqueAngle.marqueRemplie) !== 0) { ch += '\\fill' + this.tikzFillStyle() + this.tikzFillPathAngleDroit(dimf, bu) + ';' + '\n' }
    ch += '\\draw' + this.tikzLineStyle(dimf, coefmult) + this.tikzPathAngleDroit(dimf, bu) + ';'
    if ((styleMarque & StyleMarqueAngle.marqueAvecTrait) !== 0) {
      marqueSegment.donneCouleur(this.couleur)
      marqueSegment.donneStyle(this.style)
      marqueSegment.donneMotif(StyleMarqueAngle.styleMarqueSegment(styleMarque))
      ch += '\n' + marqueSegment.tikz(dimf, nomaff, coefmult, bu)
    }
  } else {
    const mesureAngle = this.u.mesureAngleVecteurs(this.v)
    if ((styleMarque & StyleMarqueAngle.marqueRemplie) !== 0) { ch += '\\fill' + this.tikzFillStyle() + this.tikzFillPath(dimf, bu) + ';' + '\n' }
    ch += '\\draw ' + this.tikzLineStyle(dimf, coefmult) + this.tikzPath(dimf, bu) + ';'
    if ((styleMarque & StyleMarqueAngle.marqueAvecTrait) !== 0) { ch += '\n' + this.tikzMarqueAngle(dimf, this.a.x, this.a.y, this.centreX, this.centreY, mesureAngle, coefmult, bu) }
  }
  return ch
}

CMarqueAngleGeometrique.prototype.tikzPath = function (dimf, bu) {
  const centreX = this.centreX
  const centreY = this.centreY
  const a = this.a
  const b = this.b
  const rayon = this.rayon
  const list = this.listeProprietaire

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
  const dif = mesurePrincipale(ang2 - ang1)
  if (dif > 0) {
    if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
  } else {
    if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
  }

  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg

  return '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc ' +
    '(' + chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ')'
}

CMarqueAngleGeometrique.tikzFillPath = function (dimf, bu) {
  const list = this.listeProprietaire
  return '(' + chaineNombre(list.tikzXcoord(this.centreX, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(this.centreY, dimf, bu), 3) + ')--' + this.tikzPath(dimf, bu)
}

CMarqueAngleGeometrique.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) &&
  this.a.estDefPar(listeOb) &&
  this.b.estDefPar(listeOb)
}
