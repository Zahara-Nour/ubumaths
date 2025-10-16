/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatArc from '../types/NatArc'
import Vect from '../types/Vect'
import { zeroAngle } from '../kernel/kernel'
import CArcDeCercle from './CArcDeCercle'
export default CGrandArcDeCercle

/**
 * Classe représentant un grand arc de cercle défini par son centre, le point de départ et soit
 * un point donnant la dircetion de fin soit la valeur de l'angle au centre.
 * @constructor
 * @extends CArcDeCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} o  Le centre de l'arc.
 * @param {CPt} a  Le point donnant le début de l'arc.
 * @param {CPt} pointFinArc  Le point donnant la fin de l'arc.
 * Si null c'est que l'arc est défini par son angle au centre.
 * @param {CValeurAngle} angleAuCentre  L'angle au centre (si pointFinArc est null)
 * @returns {CGrandArcDeCercle}
 */
function CGrandArcDeCercle (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, o, a, pointFinArc, angleAuCentre) {
  if (arguments.length === 1) CArcDeCercle.call(this, listeProprietaire)
  else {
    CArcDeCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.o = o
    this.a = a
    this.pointFinArc = pointFinArc
    this.angleAuCentre = angleAuCentre
  }
}
CGrandArcDeCercle.prototype = new CArcDeCercle()
CGrandArcDeCercle.prototype.constructor = CGrandArcDeCercle
CGrandArcDeCercle.prototype.superClass = 'CArcDeCercle'
CGrandArcDeCercle.prototype.className = 'CGrandArcDeCercle'

CGrandArcDeCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.a)
  let ptFinArc = null
  let angleAuCentreClone
  if (this.pointFinArc === null) { angleAuCentreClone = this.angleAuCentre.getClone(listeSource, listeCible) } else {
    const ind3 = listeSource.indexOf(this.pointFinArc)
    ptFinArc = listeCible.get(ind3, 'CPt')
    angleAuCentreClone = null
  }
  const ind4 = listeSource.indexOf(this.impProto)
  return new CGrandArcDeCercle(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), ptFinArc, angleAuCentreClone)
}
CGrandArcDeCercle.prototype.path = function () {
  const u = new Vect(this.centreX, this.centreY, this.origine_x, this.origine_y)
  const v = new Vect()
  u.tourne(this.valeurAngleAuCentre, v)
  const xf = this.centreX + v.x
  const yf = this.centreY + v.y
  const sweepflag = (this.valeurAngleAuCentre < 0) ? '0 ' : '1 '
  return 'M ' + this.origine_x.toString() + ' ' + this.origine_y + 'A' + this.rayon + ',' +
    this.rayon + ' 0 1 ' + sweepflag + xf.toString() + ',' + yf.toString()
}
CGrandArcDeCercle.prototype.surArc = function (xt, yt) {
  let ang1aux, ang2aux, d

  const w = new Vect(this.centreX, this.centreY, xt, yt)
  const ang = w.angleRad()
  ang1aux = this.ang1
  ang2aux = this.ang2
  if (ang1aux > ang2aux) {
    d = ang2aux
    ang2aux = ang1aux
    ang1aux = d
  }
  const dif = ang2aux - ang1aux
  if (zeroAngle(dif - Math.PI)) {
    if (zeroAngle(ang - this.ang1) || zeroAngle(ang - this.ang2)) return true
    if (this.ang1 >= this.ang2) return ((ang >= this.ang2) && (ang <= this.ang1))
    else {
      return ((ang >= this.ang2) || (ang <= this.ang1))
    }
  } else {
    if (zeroAngle(ang - ang1aux) || zeroAngle(ang - ang2aux)) return true
    if (dif < Math.PI) {
      return ((ang <= ang1aux) || (ang >= ang2aux))
    } else {
      return ((ang >= ang1aux) && (ang <= ang2aux))
    }
  }
}
CGrandArcDeCercle.prototype.abscisseCurviligne = function (ang) {
  let difang
  if (this.valeurAngleAuCentre === 0) return 0
  if (this.valeurAngleAuCentre >= 0) {
    if (ang <= this.ang1) difang = this.ang1 - ang
    else difang = 2 * Math.PI - ang + this.ang1
  } else {
    if (ang >= this.ang1) difang = ang - this.ang1
    else difang = 2 * Math.PI - this.ang1 + ang
  }
  return difang / (2 * Math.PI - Math.abs(this.valeurAngleAuCentre))
}
CGrandArcDeCercle.prototype.natureArc = function () {
  return NatArc.GrandArc
}
