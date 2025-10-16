/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CTransformation from './CTransformation'
export default CSymetrieAxiale

/**
 * Classe représentant une symétrie axiale (transformation)
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CDroiteAncetre} axe  L'axe de symétrie (peutêtre aussi un segment ou une demi-droite)
 * @returns {CSymetrieAxiale}
 */
function CSymetrieAxiale (listeProprietaire, impProto, estElementFinal, axe) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.axe = axe
  }
}
CSymetrieAxiale.prototype = new CTransformation()
CSymetrieAxiale.prototype.constructor = CSymetrieAxiale
CSymetrieAxiale.prototype.superClass = 'CTransformation'
CSymetrieAxiale.prototype.className = 'CSymetrieAxiale'
/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CSymetrieAxiale.prototype.natureTransformation = function () {
  return CTransformation.symetrieAxiale
}
CSymetrieAxiale.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.axe)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSymetrieAxiale(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CDroiteAncetre'))
}
CSymetrieAxiale.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) || this.axe.depDe(p))
}
CSymetrieAxiale.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.axe.dependDePourBoucle(p))
}
CSymetrieAxiale.prototype.positionne = function () {
  this.existe = this.axe.existe
}
CSymetrieAxiale.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return this.axe === p.axe
  else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CSymetrieAxiale.prototype.transformePoint = function (x, y, pointr) {
  const u = new Vect(this.axe.point_x, this.axe.point_y, x, y)
  const uimage = new Vect()
  this.transformeVecteur(u, uimage)
  pointr.x = this.axe.point_x + uimage.x
  pointr.y = this.axe.point_y + uimage.y
}
CSymetrieAxiale.prototype.transformeAngle = function (ang, pointeur) {
  pointeur.setValue(-ang)
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CSymetrieAxiale.prototype.transformeVecteur = function (u, ur) {
  const x = u.x
  const y = u.y
  const ax = this.axe.vect.x
  const ay = this.axe.vect.y
  const norm2 = ax * ax + ay * ay
  const k1 = ax * ax - ay * ay
  const k2 = 2 * ax * ay
  ur.x = (k1 * x + k2 * y) / norm2
  ur.y = (k2 * x - k1 * y) / norm2
}
CSymetrieAxiale.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.axe = list.get(ind1, 'CDroiteAncetre')
}
CSymetrieAxiale.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.axe)
  oups.writeInt(ind1)
}
