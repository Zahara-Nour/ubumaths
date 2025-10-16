/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatArc from '../types/NatArc'
import Vect from '../types/Vect'
import { mesurePrincipale, zeroAngle } from '../kernel/kernel'
import CArcDeCercleAncetre from './CArcDeCercleAncetre'
import CValeurAngle from './CValeurAngle'
export default CArcDeCercle

/**
 * Classe représentant un petit arc de cercle.
 * Il peut être défini de deux façons :
 * Par l'origine, un point donnant le début de l'ar et un point donnant la direction de la fin de l'arc.
 * Ou par l'origine, un point donnant le début de l'arc et la valeur de l'angle au centre.
 * @constructor
 * @extends CArcDeCercleAncetre
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
 * @returns {CArcDeCercle}
 */
function CArcDeCercle (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, o, a, pointFinArc, angleAuCentre) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CArcDeCercleAncetre.call(this, listeProprietaire)
  else {
    CArcDeCercleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.o = o
    this.a = a
    this.pointFinArc = pointFinArc
    this.angleAuCentre = angleAuCentre
  }
}
CArcDeCercle.prototype = new CArcDeCercleAncetre()
CArcDeCercle.prototype.constructor = CArcDeCercle
CArcDeCercle.prototype.superClass = 'CArcDeCercleAncetre'
CArcDeCercle.prototype.className = 'CArcDeCercle'

CArcDeCercle.prototype.setClone = function (ptel) {
  CArcDeCercleAncetre.prototype.setClone.call(this, ptel)
  this.ang1 = ptel.ang1
  this.ang2 = ptel.ang2
  this.valeurAngleAuCentre = ptel.valeurAngleAuCentre
}
CArcDeCercle.prototype.getClone = function (listeSource, listeCible) {
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
  return new CArcDeCercle(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), ptFinArc, angleAuCentreClone)
}
CArcDeCercle.prototype.positionne = function (infoRandom, dimfen) {
  let u
  if (this.pointFinArc === null) {
    this.angleAuCentre.positionne(infoRandom, dimfen)
    this.existe = this.o?.existe && this.a?.existe && this.angleAuCentre.existe
    if (!this.existe) return
    this.valeurAngleAuCentre = this.angleAuCentre.rendValeurRadian()
    if (zeroAngle(this.valeurAngleAuCentre)) {
      this.existe = false
      return
    }
    u = new Vect(this.o, this.a)
    this.rayon = u.norme()
    this.centreX = this.o.x
    this.centreY = this.o.y
    this.origine_x = this.a.x
    this.origine_y = this.a.y
    this.ang1 = u.angleRad()
    this.ang2 = this.ang1 + this.valeurAngleAuCentre
    if (this.ang2 < 0) this.ang2 = this.ang2 + 2 * Math.PI
    if (this.ang2 >= 2 * Math.PI) this.ang2 = this.ang2 - 2 * Math.PI
  } else {
    this.existe = this.o.existe && this.a.existe && this.pointFinArc.existe
    if (!this.existe) return
    u = new Vect(this.o, this.a)
    this.rayon = u.norme()
    this.centreX = this.o.x
    this.centreY = this.o.y
    this.origine_x = this.a.x
    this.origine_y = this.a.y
    this.ang1 = u.angleRad()
    const v = new Vect(this.o, this.pointFinArc)
    this.ang2 = v.angleRad()
    this.valeurAngleAuCentre = mesurePrincipale(this.ang2 - this.ang1)
    if (zeroAngle(this.valeurAngleAuCentre)) {
      this.existe = false
      return
    }
  }
  CArcDeCercleAncetre.prototype.positionne.call(this, infoRandom, dimfen)
}
// Ajout version 6.3.0
CArcDeCercle.prototype.positionneFull = function (infoRandom, dimfen) {
  if (this.pointFinArc === null) this.angleAuCentre.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CArcDeCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    if (this.pointFinArc === null) { return (this.o === p.o) && (this.a === p.a) && this.angleAuCentre.confonduAvec(p.angleAuCentre) } else { return (this.o === p.o) && (this.a === p.a) && (this.pointFinArc === p.pointFinArc) }
  } else return false
}
CArcDeCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
  liste.add(this.a)
  if (this.pointFinArc !== null) liste.add(this.pointFinArc)
}
CArcDeCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  if (this.pointFinArc === null) {
    return this.memDep(CArcDeCercleAncetre.prototype.depDe.call(this, p) ||
     this.o.depDe(p) || this.a.depDe(p) || this.angleAuCentre.depDe(p))
  } else {
    return this.memDep(CArcDeCercleAncetre.prototype.depDe.call(this, p) ||
      this.o.depDe(p) || this.a.depDe(p) || this.pointFinArc.depDe(p))
  }
}
CArcDeCercle.prototype.dependDePourBoucle = function (p) {
  if (this.pointFinArc === null) {
    return (p === this) || this.o.dependDePourBoucle(p) ||
      this.a.dependDePourBoucle(p) || this.angleAuCentre.dependDePourBoucle(p)
  } else {
    return (p === this) || this.o.dependDePourBoucle(p) ||
    this.a.dependDePourBoucle(p) || this.pointFinArc.dependDePourBoucle(p)
  }
}
/**
 * Spécial JavaScript
 * Renvoie le path pour définir le svg element associé.
 */
CArcDeCercle.prototype.path = function () {
  const u = new Vect(this.centreX, this.centreY, this.origine_x, this.origine_y)
  const v = new Vect()
  u.tourne(this.valeurAngleAuCentre, v)
  const xf = this.centreX + v.x
  const yf = this.centreY + v.y
  const sweepflag = (this.valeurAngleAuCentre < 0) ? '1 ' : '0 '
  return 'M ' + this.origine_x.toString() + ' ' + this.origine_y + 'A' + this.rayon + ',' +
    this.rayon + ' 0 0 ' + sweepflag + xf.toString() + ',' + yf.toString()
}
CArcDeCercle.prototype.surArc = function (xt, yt) {
  let ang1aux, ang2aux, dif, d

  const w = new Vect(this.centreX, this.centreY, xt, yt)
  const ang = w.angleRad()
  if (zeroAngle(Math.abs(this.valeurAngleAuCentre) - Math.PI)) {
    if (zeroAngle(ang - this.ang1)) return true
    if (this.valeurAngleAuCentre > 0) { // Cas d'un petit arc tracé dans le sens direct
      if (this.ang1 <= Math.PI) return ((ang >= this.ang1) && (ang <= this.ang1 + Math.PI)) || zeroAngle(ang - this.ang1 - Math.PI)
      else return (ang >= this.ang1) || (ang <= this.ang1 - Math.PI) || zeroAngle(ang - this.ang1 + Math.PI)
    } else {
      if (this.ang1 <= Math.PI) return (ang >= this.ang1 + Math.PI) || (ang <= this.ang1) || zeroAngle(ang - this.ang1 - Math.PI)
      else return ((ang <= this.ang1) && (ang >= this.ang1 - Math.PI)) || zeroAngle(ang - this.ang1 + Math.PI)
    }
  } else {
    ang1aux = this.ang1
    ang2aux = this.ang2
    // On ordonne ang1Aux et ang2Aux dans l'ordre croissant
    if (ang1aux > ang2aux) {
      d = ang2aux
      ang2aux = ang1aux
      ang1aux = d
    }
    if (zeroAngle(ang - ang1aux) || zeroAngle(ang - ang2aux)) return true
    dif = ang2aux - ang1aux
    if (dif < Math.PI) return (ang >= ang1aux) && (ang <= ang2aux)
    else return (ang <= ang1aux) || (ang >= ang2aux)
  }
}
/**
 * Fonction servant à positionner un point lié à un arc de cercle.
 * Renvoie un nombre compris entre 0 et 1.
 * @param {number} ang  La valeur testée.
 * @returns {number}
 */
CArcDeCercle.prototype.abscisseCurviligne = function (ang) {
  let difang
  if (this.valeurAngleAuCentre === 0) return 0
  difang = Math.abs(ang - this.ang1)
  if (difang > Math.PI) difang = 2 * Math.PI - difang
  return difang / Math.abs(this.valeurAngleAuCentre)
}
CArcDeCercle.prototype.abscisseMinimale = function () {
  return 0
}
CArcDeCercle.prototype.abscisseMaximale = function () {
  return 1
}
/**
 * Renvoie la nature de l'arc.
 * @returns {NatArc}
 */
CArcDeCercle.prototype.natureArc = function () {
  return NatArc.PetitArc
}
CArcDeCercle.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.pointFinArc === ancienPoint) this.pointFinArc = nouveauPoint
}

CArcDeCercle.prototype.read = function (inps, list) {
  CArcDeCercleAncetre.prototype.read.call(this, inps, list)
  this.angleAuCentre = null
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  this.a = list.get(ind2, 'CPt')
  this.pointFinArc = null
  const ind3 = inps.readInt()
  if (ind3 === -1) {
    this.angleAuCentre = new CValeurAngle()
    this.angleAuCentre.read(inps, list)
  } else this.pointFinArc = list.get(ind3, 'CPt')
}
CArcDeCercle.prototype.write = function (oups, list) {
  CArcDeCercleAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.a)
  oups.writeInt(ind2)
  let ind3
  if (this.pointFinArc === null) ind3 = -1
  else ind3 = list.indexOf(this.pointFinArc)
  oups.writeInt(ind3)
  if (this.pointFinArc === null) this.angleAuCentre.write(oups, list)
}
