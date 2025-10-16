/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CTransformation from './CTransformation'
export default CTranslation

/**
 * Classe représentant la transformation translation définie par deux points.
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} or  Point origine du vecteur.
 * @param {CPt} ex  Point extrémité du vecteur.
 * @returns {CTranslation}
 */
function CTranslation (listeProprietaire, impProto, estElementFinal, or, ex) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.or = or
    this.ex = ex
    this.valeurVecteur = new Vect()
  }
}
CTranslation.prototype = new CTransformation()
CTranslation.prototype.constructor = CTranslation
CTranslation.prototype.superClass = 'CTransformation'
CTranslation.prototype.className = 'CTranslation'
/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CTranslation.prototype.natureTransformation = function () {
  return CTransformation.translation
}

CTranslation.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.or)
  const ind2 = listeSource.indexOf(this.ex)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CTranslation(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'))
}
CTranslation.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) ||
    this.or.depDe(p) || this.ex.depDe(p))
}
CTranslation.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.or.dependDePourBoucle(p) || this.ex.dependDePourBoucle(p))
}
CTranslation.prototype.positionne = function () {
  this.existe = this.or.existe && this.ex.existe
  if (this.existe) this.valeurVecteur.setVecteur(this.or, this.ex)
}
CTranslation.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.or === p.or) && (this.ex === p.ex)
  } else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CTranslation.prototype.transformePoint = function (x, y, pointr) {
  pointr.x = x + this.valeurVecteur.x
  pointr.y = y + this.valeurVecteur.y
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CTranslation.prototype.transformeVecteur = function (u, ur) {
  u.setCopy(ur)
}
CTranslation.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.or === ancienPoint) this.or = nouveauPoint
  if (this.ex === ancienPoint) this.ex = nouveauPoint
}
CTranslation.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  this.valeurVecteur = new Vect()
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.or = list.get(ind1, 'CPt')
  this.ex = list.get(ind2, 'CPt')
}
CTranslation.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.or)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.ex)
  oups.writeInt(ind2)
}
