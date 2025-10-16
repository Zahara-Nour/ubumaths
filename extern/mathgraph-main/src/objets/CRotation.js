/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CTransformation from './CTransformation'
import CValeurAngle from './CValeurAngle'
export default CRotation

/**
 * Classe définition une rotation définie par son centre et son angle.
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} centre  Le point centre de la rotation.
 * @param {CValeurAngle} angle  L'angle de la rotation.
 * @returns {CRotation}
 */
function CRotation (listeProprietaire, impProto, estElementFinal, centre, angle) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.centre = centre
    this.angle = angle
  }
}
CRotation.prototype = new CTransformation()
CRotation.prototype.constructor = CRotation
CRotation.prototype.superClass = 'CTransformation'
CRotation.prototype.className = 'CRotation'

/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CRotation.prototype.natureTransformation = function () {
  return CTransformation.rotation
}

CRotation.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.centre)
  const angleClone = this.angle.getClone(listeSource, listeCible)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CRotation(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), angleClone)
}
CRotation.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) ||
    this.centre.depDe(p) || this.angle.depDe(p))
}
CRotation.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.centre.dependDePourBoucle(p) || this.angle.dependDePourBoucle(p))
}
CRotation.prototype.positionne = function (infoRandom) {
  this.angle.positionne(infoRandom)
  this.existe = this.centre.existe && this.angle.existe
  if (this.existe) this.valeurAngle = this.angle.rendValeurRadian()
}
// Ajout version 6.3.0
CRotation.prototype.positionneFull = function (infoRandom) {
  this.angle.dejaPositionne = false
  this.positionne(infoRandom)
}
CRotation.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.centre.confonduAvec(p.centre) && this.angle.confonduAvec(p.angle)
  } else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CRotation.prototype.transformePoint = function (x, y, pointr) {
  const u = new Vect(this.centre.x, this.centre.y, x, y)
  const v = new Vect()
  u.tourne(this.valeurAngle, v)
  pointr.x = this.centre.x + v.x
  pointr.y = this.centre.y + v.y
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CRotation.prototype.transformeVecteur = function (u, ur) {
  u.tourne(this.valeurAngle, ur)
}
CRotation.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.centre === ancienPoint) this.centre = nouveauPoint
}
CRotation.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.centre = list.get(ind1, 'CPt')
  this.angle = new CValeurAngle()
  this.angle.read(inps, list)
}
CRotation.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.centre)
  oups.writeInt(ind1)
  this.angle.write(oups, list)
}
