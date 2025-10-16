/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTransformation from './CTransformation'
import CValeur from './CValeur'
export default CHomothetie

/**
 * Classe représentant une homothétie (objet transformation).
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} centre  Le point centre de l'homothétie.
 * @param {CValeur} rapport  Le rapport de l'homothétie
 * @returns {CHomothetie}
 */
function CHomothetie (listeProprietaire, impProto, estElementFinal, centre, rapport) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.centre = centre
    this.rapport = rapport
  }
}
CHomothetie.prototype = new CTransformation()
CHomothetie.prototype.constructor = CHomothetie
CHomothetie.prototype.superClass = 'CTransformation'
CHomothetie.prototype.className = 'CHomothetie'

/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CHomothetie.prototype.natureTransformation = function () {
  return CTransformation.homothetie
}

CHomothetie.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.centre)
  const ind2 = listeSource.indexOf(this.impProto)
  const rapportClone = this.rapport.getClone(listeSource, listeCible)
  return new CHomothetie(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), rapportClone)
}
CHomothetie.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) ||
    this.centre.depDe(p) || this.rapport.depDe(p))
}
CHomothetie.prototype.initialisePourDependance = function () {
  CTransformation.prototype.initialisePourDependance.call(this)
  this.rapport.initialisePourDependance()
}
CHomothetie.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.centre.dependDePourBoucle(p) || this.rapport.dependDePourBoucle(p))
}
CHomothetie.prototype.positionne = function (infoRandom) {
  this.rapport.positionne(infoRandom)
  this.existe = this.centre.existe && this.rapport.existe
  if (this.existe) this.valeurRapport = this.rapport.rendValeur()
}
// Ajout version 6.3.0
CHomothetie.prototype.positionneFull = function (infoRandom) {
  this.rapport.dejaPositionne = false
  this.positionne(infoRandom)
}
CHomothetie.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.centre === p.centre) && (this.rapport.confonduAvec(p.rapport))
  } else return false
}
/**
 * Renvoie l'image de la longueur L par la transformation
 * @param {number} l  La valeur de la longueur à transformr
 * @returns {number}
 */
CHomothetie.prototype.transformeLongueur = function (l) {
  return l * Math.abs(this.valeurRapport)
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 */
CHomothetie.prototype.transformePoint = function (x, y, pointr) {
  pointr.x = this.centre.x + this.valeurRapport * (x - this.centre.x)
  pointr.y = this.centre.y + this.valeurRapport * (y - this.centre.y)
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CHomothetie.prototype.transformeVecteur = function (u, ur) {
  ur.x = this.valeurRapport * u.x
  ur.y = this.valeurRapport * u.y
}
CHomothetie.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.centre === ancienPoint) this.centre = nouveauPoint
}
CHomothetie.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.centre = list.get(ind1, 'CPt')
  this.rapport = new CValeur()
  this.rapport.read(inps, list)
}
CHomothetie.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.centre)
  oups.writeInt(ind1)
  this.rapport.write(oups, list)
}
