/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Complexe from '../types/Complexe'
import { chaineNombre } from '../kernel/kernel'
import CElementBase from './CElementBase'

export default CValDyn

/**
 * Classe ancêtre de tous les objets représentant un objet numérique, calcul ou mesure.
 * @constructor
 * @extends CElementBase
 * @param {CListeObjets} listeProprietaire
 * @param {CImplementationProto} impProto  null ou pointeur sur la construction propriétaire
 * @param {boolean} estElementFinal
 * @returns {void}
 */
function CValDyn (listeProprietaire, impProto, estElementFinal) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementBase.call(this, listeProprietaire)
    else CElementBase.call(this, listeProprietaire, impProto, estElementFinal)
    this.z1 = new Complexe()
  }
}

// noinspection JSCheckFunctionSignatures
CValDyn.prototype = new CElementBase()
CValDyn.prototype.constructor = CValDyn
CValDyn.prototype.superClass = 'CElementBase'
CValDyn.prototype.className = 'CValDyn'

/** @inheritDoc */
CValDyn.prototype.getNature = function () {
  return NatObj.NAucunObjet
}
// Méthode à redéfinir pour les descendants renvoyant la valeur. Ne sert pas ici
/**
 * Fonction renvoyant la valeur du calcul (réelle).
 * Doit être redéfini pour les descendants
 * @returns {number}
 */
CValDyn.prototype.rendValeur = function () {
  return 0
}
/**
 * Fonction renvoyant la valeur du calcul complexe dans zRes.
 * Doit être redéfini pour les descendants
 * @param {Complexe} zRes
 */
CValDyn.prototype.rendValeurComplexe = function (zRes) {
  zRes.x = this.rendValeur()
  zRes.y = 0
}
/**
 * Renvoie la valeur du calcul réel sous forme d'une chaîne
 * @param {number} nbDecimales  le nombre de décimales souhaité
 * @returns {string}
 */
CValDyn.prototype.rendChaineValeur = function (nbDecimales) {
  let ch = chaineNombre(this.rendValeur(), nbDecimales)
  if (!this.listeProprietaire.decimalDot) ch = ch.replace('.', ',')
  return ch
}
/**
 * Renvoie la valeur du calcul complexe sous forme d'une chaîne
 * @param {number} nbDecimales
 * @returns {string}
 */
CValDyn.prototype.rendChaineValeurComplexe = function (nbDecimales) {
  this.rendValeurComplexe(this.z1)
  let ch = this.z1.chaineValeurComplexe(nbDecimales)
  if (!this.listeProprietaire.decimalDot) ch = ch.replaceAll('.', ',')
  return ch
}
/**
 * Renvoie la valeur du calcul réel sous forme d'une chaîne
 * @param {number} nbDecimales
 * @returns {string}
 */
CValDyn.prototype.rendChaineValeurPourCommentaire = function (nbDecimales) {
  return this.rendChaineValeur(nbDecimales)
}
/**
 * Renvoie true si ch est égale au nom de a valeur
 * @param {string} ch
 * @returns {boolean}
 */
CValDyn.prototype.chaineEgaleANom = function (ch) {
  return (this.getNom() === ch)
}
// Ne sera redéfini que pour les calculs et les variables
/**
 * Renvoie le nom de la valeur
 * Ne sera redéfini que pour les calculs et les variables
 * @returns {string}
 */
CValDyn.prototype.getNom = function () {
  return ''
}
/**
 * Renvoie true si ch commence par le nom de la valeur
 * @param {string} ch
 * @param {Object} longueurNom  Contient dans x au retour la longueur du nom
 * si la chaine commence bien par ch
 * @returns {boolean}
 */
CValDyn.prototype.chaineCommenceParNom = function (ch, longueurNom) {
  const chaineNom = this.getNom()
  longueurNom.x = chaineNom.length
  const longueurChaine2 = ch.length
  if (longueurChaine2 < longueurNom.x) return false
  else return chaineNom === ch.substring(0, longueurNom.x)
}
/**
 * Renvoie true si l'objet est une fonction ou une suite ou une matrice
 * @returns {boolean}
 */
CValDyn.prototype.estFonctionOuSuite = function () {
  return false
}
/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat, CMatriceParForm et CCalcMat CCalcMat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction
 * @returns {boolean}
 */
CValDyn.prototype.estMatrice = function () {
  return false
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction (matrices ne résultant pas d'un calcul)
 * @returns {boolean}
 */
CValDyn.prototype.estMatriceBase = function () {
  return false
}

/**
 * Si cette fonction est appelée c'est qu'on a utilisé une des deux fonctions globales getLeft et getRight
 * sur autre chose qu'un CCalcul ou un CCalculComp (calul réel ou complexe) et le calcul n'exise pas
 * @returns {CCb}
 */
CValDyn.prototype.membreGauche = function () {
  return null
}

/**
 * Si cette fonction est appelée c'est qu'on a utilisé une des deux fonctions globales getLeft et getRight
 * sur autre chose qu'un CCalcul ou un CCalculComp (calul réel ou complexe) et le calcul n'exise pas
 * @returns {CCb}
 */
CValDyn.prototype.membreDroit = function () {
  return null
}

/**
 * Renvoie true si le résultat de la valeur est constant
 * A redéfinir pour les descendants
 * @returns {boolean}
 */
CValDyn.prototype.estConstant = function () {
  return false
}

/**
 * Renvoie true si le nom de la valeur commence par st
 * @param {string} st
 * @returns {boolean}
 */
CValDyn.prototype.nomCommencePar = function (st) {
  return this.getNom().indexOf(st) === 0
}

CValDyn.prototype.isPoint4Vect = function () {
  return false
}

CValDyn.prototype.isVect4Vect = function () {
  return false
}
