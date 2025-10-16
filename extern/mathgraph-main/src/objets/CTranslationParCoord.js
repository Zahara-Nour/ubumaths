/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CTransformation from './CTransformation'
import CValeur from './CValeur'
export default CTranslationParCoord

/**
 * Classe représenntant une translation définie par un repère et les coordonnées du
 * vecteur de la translation.
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CValeur} x  La première coordonnée du vecteur de la transaltion
 * @param {CValeur} y  La deuxième coordonnée du vecteur de la transaltion
 * @param {CRepere} rep  Le repère.
 * @returns {CTranslationParCoord}
 */
function CTranslationParCoord (listeProprietaire, impProto, estElementFinal, x, y, rep) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.x = x
    this.y = y
    this.rep = rep
    this.valeurVecteur = new Vect()
  }
  this.valeurVecteur = new Vect()
}
CTranslationParCoord.prototype = new CTransformation()
CTranslationParCoord.prototype.constructor = CTranslationParCoord
CTranslationParCoord.prototype.superClass = 'CTransformation'
CTranslationParCoord.prototype.className = 'CTranslationParCoord'

/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CTranslationParCoord.prototype.natureTransformation = function () {
  return CTransformation.translationParCoord
}
CTranslationParCoord.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  const xClone = this.x.getClone(listeSource, listeCible)
  const yClone = this.y.getClone(listeSource, listeCible)
  return new CTranslationParCoord(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, xClone, yClone, listeCible.get(ind1, 'CRepere'))
}
CTranslationParCoord.prototype.initialisePourDependance = function () {
  CTransformation.prototype.initialisePourDependance.call(this)
  this.x.initialisePourDependance()
  this.y.initialisePourDependance()
}
CTranslationParCoord.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) ||
    this.rep.depDe(p) || this.x.depDe(p) || this.y.depDe(p))
}
CTranslationParCoord.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.rep.dependDePourBoucle(p) || this.x.dependDePourBoucle(p) || this.y.dependDePourBoucle(p))
}
CTranslationParCoord.prototype.positionne = function (infoRandom, dimfen) {
  this.x.positionne(infoRandom, dimfen)
  this.y.positionne(infoRandom, dimfen)
  this.existe = this.rep.existe && this.x.existe && this.y.existe
  if (this.existe) {
    this.valeurVecteur.x = this.x.rendValeur() / this.rep.unitex
    this.valeurVecteur.y = this.y.rendValeur() / this.rep.unitey
  }
}
CTranslationParCoord.prototype.positionneFull = function (infoRandom, dimfen) {
  this.x.dejaPositionne = false
  this.y.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CTranslationParCoord.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.rep === p.rep) && this.x.confonduAvec(p.x) && this.y.confonduAvec(p.y)
  } else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CTranslationParCoord.prototype.transformePoint = function (x, y, pointr) {
  pointr.x = x + this.valeurVecteur.x * this.rep.u.x + this.valeurVecteur.y * this.rep.v.x
  pointr.y = y + this.valeurVecteur.x * this.rep.u.y + this.valeurVecteur.y * this.rep.v.y
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CTranslationParCoord.prototype.transformeVecteur = function (u, ur) {
  u.setCopy(ur)
}
CTranslationParCoord.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.rep = list.get(ind1, 'CRepere')
  this.x = new CValeur()
  this.y = new CValeur()
  this.x.read(inps, list)
  this.y.read(inps, list)
}
CTranslationParCoord.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.rep)
  oups.writeInt(ind1)
  this.x.write(oups, list)
  this.y.write(oups, list)
}
