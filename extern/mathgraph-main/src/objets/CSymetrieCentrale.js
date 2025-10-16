/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTransformation from './CTransformation'
export default CSymetrieCentrale

/**
 * Classe représentant une symétrie centrale (transformation)
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} centre  L centre de la symétrie.
 * @returns {CSymetrieCentrale}
 */
function CSymetrieCentrale (listeProprietaire, impProto, estElementFinal, centre) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.centre = centre
  }
}
CSymetrieCentrale.prototype = new CTransformation()
CSymetrieCentrale.prototype.constructor = CSymetrieCentrale
CSymetrieCentrale.prototype.superClass = 'CTransformation'
CSymetrieCentrale.prototype.className = 'CSymetrieCentrale'

/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CSymetrieCentrale.prototype.natureTransformation = function () {
  return CTransformation.symetrieCentrale
}
CSymetrieCentrale.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.centre)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSymetrieCentrale(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'))
}
CSymetrieCentrale.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) || this.centre.depDe(p))
}
CSymetrieCentrale.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.centre.dependDePourBoucle(p))
}
CSymetrieCentrale.prototype.positionne = function () {
  this.existe = this.centre.existe
}
CSymetrieCentrale.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.centre === p.centre
  } else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CSymetrieCentrale.prototype.transformePoint = function (x, y, pointr) {
  pointr.x = 2 * this.centre.x - x
  pointr.y = 2 * this.centre.y - y
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CSymetrieCentrale.prototype.transformeVecteur = function (u, ur) {
  ur.x = -u.x
  ur.y = -u.y
}
CSymetrieCentrale.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.centre === ancienPoint) this.centre = nouveauPoint
}
CSymetrieCentrale.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.centre = list.get(ind1, 'CPt')
}
CSymetrieCentrale.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.centre)
  oups.writeInt(ind1)
}
