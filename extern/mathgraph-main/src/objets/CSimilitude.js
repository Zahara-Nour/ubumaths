/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CValeur from './CValeur'
import CRotation from './CRotation'
export default CSimilitude

/**
 * Classe représentant une similitude (transformation).
 * @constructor
 * @extends CRotation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} centre  Le centre de la similitude.
 * @param angle L'angle de la similitude.
 * @param rapport Le rapport de la similitude.
 * @returns {CSimilitude}
 */
function CSimilitude (listeProprietaire, impProto, estElementFinal, centre, angle, rapport) {
  if (arguments.length === 1) CRotation.call(this, listeProprietaire)
  else {
    CRotation.call(this, listeProprietaire, impProto, estElementFinal, centre, angle)
    this.rapport = rapport
  }
}
CSimilitude.prototype = new CRotation()
CSimilitude.prototype.constructor = CSimilitude
CSimilitude.prototype.superClass = 'CRotation'
CSimilitude.prototype.className = 'CSimilitude'
/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CSimilitude.prototype.natureTransformation = function () {
  return this.similitude
}
CSimilitude.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.centre)
  const ind2 = listeSource.indexOf(this.impProto)
  const angleClone = this.angle.getClone(listeSource, listeCible)
  const rapportClone = this.rapport.getClone(listeSource, listeCible)
  return new CSimilitude(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), angleClone, rapportClone)
}
CSimilitude.prototype.initialisePourDependance = function () {
  CRotation.prototype.initialisePourDependance.call(this)
  this.rapport.initialisePourDependance()
}
CSimilitude.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CRotation.prototype.depDe.call(this, p) || this.rapport.depDe(p))
}
CSimilitude.prototype.dependDePourBoucle = function (p) {
  return CRotation.prototype.dependDePourBoucle.call(this, p) || this.rapport.dependDePourBoucle(p)
}
CSimilitude.prototype.positionne = function (infoRandom) {
  CRotation.prototype.positionne.call(this, infoRandom)
  this.rapport.positionne(infoRandom)
  this.existe = this.existe && this.rapport.existe
  if (this.existe) this.valeurRapport = this.rapport.rendValeur()
}
// Ajout version 6.3.0
CSimilitude.prototype.positionneFull = function (infoRandom) {
  CRotation.prototype.positionneFull.call(this, infoRandom)
  this.rapport.dejaPositionne = false
  this.positionne(infoRandom)
}

CSimilitude.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return this.centre.confonduAvec(p.centre) && this.angle.confonduAvec(p.angle) &&
            this.rapport.confonduAvec(p.rapport)
  } else return false
}
CSimilitude.prototype.transformeLongueur = function (l) {
  return Math.abs(this.valeurRapport) * l
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CSimilitude.prototype.transformePoint = function (x, y, pointr) {
  // On crée d'abord l'image par l'objet rotation dont CSimilitude
  // hérite puis on prend l'image par une homothétie de rapport k
  const point1 = {}
  CRotation.prototype.transformePoint.call(this, x, y, point1)
  pointr.x = this.centre.x + this.valeurRapport * (point1.x - this.centre.x)
  pointr.y = this.centre.y + this.valeurRapport * (point1.y - this.centre.y)
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CSimilitude.prototype.transformeVecteur = function (u, ur) {
  const v = new Vect()
  CRotation.prototype.transformeVecteur.call(this, u, v)
  ur.x = this.valeurRapport * v.x
  ur.y = this.valeurRapport * v.y
}
CSimilitude.prototype.read = function (inps, list) {
  CRotation.prototype.read.call(this, inps, list)
  this.rapport = new CValeur()
  this.rapport.read(inps, list)
}
CSimilitude.prototype.write = function (oups, list) {
  CRotation.prototype.write.call(this, oups, list)
  this.rapport.write(oups, list)
}
