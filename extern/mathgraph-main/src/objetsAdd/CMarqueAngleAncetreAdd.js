/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMarqueAngleAncetre from '../objets/CMarqueAngleAncetre'
import CCercle from '../objets/CCercle'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import { chaineNombre, getStr } from '../kernel/kernel'
import Vect from '../types/Vect'
export default CMarqueAngleAncetre

/**
 * Donne à la marque le style de marque styleMarque
 * @param {StyleMarqueAngle} styleMarque
 * @returns {void}
 */
CMarqueAngleAncetre.prototype.donneStyleMarque = function (styleMarque) {
  this.styleMarque = styleMarque
  this.marqueSegment.donneMotif(StyleMarqueAngle.styleMarqueSegment(styleMarque))
}

/**
 * Renvoie true s'il s'agit d'un angle orienté.
 * @returns {boolean}
 */
CMarqueAngleAncetre.prototype.estOriente = function () {
  return false
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CMarqueAngleAncetre.prototype.genereNom = function () {
  CMarqueAngleAncetre.ind++
  return getStr('rma') + CMarqueAngleAncetre.ind
}

CMarqueAngleAncetre.prototype.tikzFillStyle = function () {
  return '[color = ' + this.tikzCouleur() + ', opacity = ' +
    chaineNombre(this.couleur.opacity, 2) + ']'
}

CMarqueAngleAncetre.prototype.tikzMarqueAngle = function (dimf, xdeb, ydeb, xcentre, ycentre, ang, coefmult, bu) {
  let x1; let y1; let x2; let y2; let xmilieu; let ymilieu; let xc1; let yc1; let ang2; let ch
  const rayon = this.rayon
  const centreX = this.centreX
  const centreY = this.centreY
  const vec1 = new Vect(xcentre, ycentre, xdeb, ydeb)
  const vec = new Vect()
  const vec2 = new Vect()
  const list = this.listeProprietaire

  vec1.tourne(ang / 2, vec)
  const nvec = vec.norme()
  vec.x = vec.x / nvec
  vec.y = vec.y / nvec
  // demilong = list.coefMult*5;
  const demilong = coefmult * 5
  switch (this.styleMarque) {
    case StyleMarqueAngle.marqueSimple1Trait :
    case StyleMarqueAngle.marquePleine1Trait :
      xmilieu = this.centreX + vec.x * rayon
      ymilieu = this.centreY + vec.y * rayon
      x1 = xmilieu - vec.x * demilong
      y1 = ymilieu - vec.y * demilong
      x2 = xmilieu + vec.x * demilong
      y2 = ymilieu + vec.y * demilong
      return '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');'

    case StyleMarqueAngle.marqueSimple2Traits :
    case StyleMarqueAngle.marquePleine2Traits :
      ang2 = Math.atan(3 / rayon) // Environ 10 pixels entre les deux traits
      vec.tourne(ang2, vec2)
      xc1 = centreX + vec2.x * rayon
      yc1 = centreY + vec2.y * rayon
      x1 = xc1 - vec.x * demilong
      y1 = yc1 - vec.y * demilong
      x2 = xc1 + vec.x * demilong
      y2 = yc1 + vec.y * demilong
      ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');' + '\n'
      vec.tourne(-ang2, vec2)
      xc1 = centreX + vec2.x * rayon
      yc1 = centreY + vec2.y * rayon
      x1 = xc1 - vec.x * demilong
      y1 = yc1 - vec.y * demilong
      x2 = xc1 + vec.x * demilong
      y2 = yc1 + vec.y * demilong
      return ch + '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');'

    case StyleMarqueAngle.marqueSimple3Traits :
    case StyleMarqueAngle.marquePleine3Traits :
      xmilieu = centreX + vec.x * rayon
      ymilieu = centreY + vec.y * rayon
      x1 = xmilieu - vec.x * demilong
      y1 = ymilieu - vec.y * demilong
      x2 = xmilieu + vec.x * demilong
      y2 = ymilieu + vec.y * demilong
      ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');' + '\n'
      ang2 = Math.atan(5 / rayon) // Environ 5 pixels entre les deux traits
      vec.tourne(ang2, vec2)
      xc1 = centreX + vec2.x * rayon
      yc1 = centreY + vec2.y * rayon
      x1 = Math.round(xc1 - vec.x * demilong)
      y1 = Math.round(yc1 - vec.y * demilong)
      x2 = Math.round(xc1 + vec.x * demilong)
      y2 = Math.round(yc1 + vec.y * demilong)
      ch += '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');' + '\n'
      vec.tourne(-ang2, vec2)
      xc1 = centreX + vec2.x * rayon
      yc1 = centreY + vec2.y * rayon
      x1 = xc1 - vec.x * demilong
      y1 = yc1 - vec.y * demilong
      x2 = xc1 + vec.x * demilong
      y2 = yc1 + vec.y * demilong
      return ch + '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');'

    case StyleMarqueAngle.marqueSimpleCroix :
    case StyleMarqueAngle.marquePleineCroix :
      xmilieu = centreX + vec.x * rayon
      ymilieu = centreY + vec.y * rayon
      vec.tourne(Math.PI / 4, vec2)
      x1 = xmilieu - vec2.x * demilong
      y1 = ymilieu - vec2.y * demilong
      x2 = xmilieu + vec2.x * demilong
      y2 = ymilieu + vec2.y * demilong
      ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');' + '\n'
      vec.tourne(-Math.PI / 4, vec2)
      x1 = xmilieu - vec2.x * demilong
      y1 = ymilieu - vec2.y * demilong
      x2 = xmilieu + vec2.x * demilong
      y2 = ymilieu + vec2.y * demilong
      return ch + '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(list.tikzXcoord(x1, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 2) + ')--(' +
        chaineNombre(list.tikzXcoord(x2, dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(y2, dimf, bu), 2) + ');'
    default : return ''
  }
}

CMarqueAngleAncetre.prototype.tikzPathAngleDroit = function (dimf, bu) {
  const list = this.listeProprietaire
  return '(' + chaineNombre(list.tikzXcoord(this.point1.x, dimf, bu), 3) + ',' +
    '(' + chaineNombre(list.tikzYcoord(this.point1.y, dimf, bu), 3) + ')--(' +
    chaineNombre(list.tikzXcoord(this.pointc.x, dimf, bu), 3) + ',' +
    '(' + chaineNombre(list.tikzYcoord(this.pointc.y, dimf, bu), 3) + ')--(' +
    chaineNombre(list.tikzXcoord(this.point2.x, dimf, bu), 3) + ',' +
    '(' + chaineNombre(list.tikzYcoord(this.point2.y, dimf, bu), 3) + ')'
}

CMarqueAngleAncetre.prototype.tikzFillPathAngleDroit = function (dimf, bu) {
  const list = this.listeProprietaire
  return '(' + chaineNombre(list.tikzXcoord(this.centreX, dimf, bu), 3) + ',' +
    chaineNombre(list.tikzYcoord(this.centreY, dimf, bu), 3) + ')--' +
    this.tikzPathAngleDroit(dimf, bu)
}

CMarqueAngleAncetre.prototype.adaptRes = function (coef) {
  CCercle.prototype.adaptRes.call(this, coef)
  this.rayon *= coef
}
