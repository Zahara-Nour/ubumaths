/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatArc from '../types/NatArc'
import Vect from '../types/Vect'
import CArcDeCercle from './CArcDeCercle'
import { zeroAngle } from 'src/kernel/kernel'
export default CArcDeCercleIndirect

/**
 * Classe représentant un arc de cercle tracé dans le sens indirect.
 * Il peut être défini de deux façons :
 * Par l'origine, un point donnant le début de l'ar et un point donnant la direction de la fin de l'arc.
 * Ou par l'origine, un point donnant le début de l'arc et la valeur de l'angle au centre.
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
  * @returns {CArcDeCercleIndirect}
 */
function CArcDeCercleIndirect (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, o, a, pointFinArc, angleAuCentre) {
  if (arguments.length === 1) CArcDeCercle.call(this, listeProprietaire)
  else {
    CArcDeCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.o = o
    this.a = a
    this.pointFinArc = pointFinArc
    this.angleAuCentre = angleAuCentre
  }
}
CArcDeCercleIndirect.prototype = new CArcDeCercle()
CArcDeCercleIndirect.prototype.constructor = CArcDeCercleIndirect
CArcDeCercleIndirect.prototype.superClass = 'CArcDeCercle'
CArcDeCercleIndirect.prototype.className = 'CArcDeCercleIndirect'

CArcDeCercleIndirect.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.a)
  let ptFinArc = null
  let angleAuCentreClone = null
  if (this.pointFinArc === null) { angleAuCentreClone = this.angleAuCentre.getClone(listeSource, listeCible) } else {
    const ind3 = listeSource.indexOf(this.pointFinArc)
    ptFinArc = listeCible.get(ind3, 'CPt')
  }
  const ind4 = listeSource.indexOf(this.impProto)
  return new CArcDeCercleIndirect(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(),
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'), ptFinArc, angleAuCentreClone)
}
CArcDeCercleIndirect.prototype.path = function () {
  const u = new Vect(this.centreX, this.centreY, this.origine_x, this.origine_y)
  const v = new Vect()
  u.tourne(this.valeurAngleAuCentre, v)
  const xf = this.centreX + v.x
  const yf = this.centreY + v.y
  const largearcflag = (this.valeurAngleAuCentre >= 0) ? '1' : '0'
  return 'M ' + this.origine_x.toString() + ' ' + this.origine_y + 'A' + this.rayon + ',' +
    this.rayon + ' 0 ' + largearcflag + ' 1 ' + xf.toString() + ',' + yf.toString()
}
CArcDeCercleIndirect.prototype.abscisseCurviligne = function (ang) {
  let angrot, difang
  angrot = this.valeurAngleAuCentre
  if (angrot === 0) return 0
  angrot = -angrot
  if (angrot < 0) angrot = angrot + 2 * Math.PI
  difang = ang - this.ang2
  if (difang < 0) difang = difang + 2 * Math.PI
  return difang / angrot
}
CArcDeCercleIndirect.prototype.surArc = function (xt, yt) {
  const w = new Vect(this.centreX, this.centreY, xt, yt)
  const ang = w.angleRad()
  if (zeroAngle(ang - this.ang1) || zeroAngle(ang - this.ang2)) return true
  if (this.ang2 <= this.ang1) return ((ang >= this.ang2) && (ang <= this.ang1))
  else return ((ang <= this.ang1) || (ang >= this.ang2))
}
CArcDeCercleIndirect.prototype.natureArc = function () {
  return NatArc.ArcIndirect
}
