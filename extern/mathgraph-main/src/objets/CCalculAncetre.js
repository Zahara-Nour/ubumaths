/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import CValDyn from './CValDyn'

export default CCalculAncetre

/**
 * @constructor
 * @extends CValDyn
 * Classe ancêtre de tous les objets de type calcul
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou pointeur sur la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément finla de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @returns {void}
 */
function CCalculAncetre (listeProprietaire, impProto, estElementFinal, nomCalcul) {
  if (arguments.length === 0) CValDyn.call(this) // Ajout version WebPack
  else {
    if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
    else CValDyn.call(this, listeProprietaire, impProto, estElementFinal)
    if (arguments.length >= 4) this.nomCalcul = nomCalcul
  }
}
// noinspection JSCheckFunctionSignatures
CCalculAncetre.prototype = new CValDyn()
CCalculAncetre.prototype.constructor = CCalculAncetre
CCalculAncetre.prototype.superClass = 'CValDyn'
CCalculAncetre.prototype.className = 'CCalculAncetre'

/**
 * Renvoie le nom du calcul
 * @returns {string}
 */
CCalculAncetre.prototype.getNom = function () {
  return this.nomCalcul
}
/**
 * Donne un nom au calcul
 * @param {string} nouveauNom
 * @returns {void}
 */
CCalculAncetre.prototype.donneNom = function (nouveauNom) {
  this.nomCalcul = nouveauNom
}
/**
 * Nombre de variables dans le cas d'une fonction, 0 sinon
 * @returns {number}
 */
CCalculAncetre.prototype.nombreVariables = function () {
  return 0
}

// on doit lister les arguments qui seront utilisés par les classes qui nous étendent
// noinspection JSUnusedLocalSymbols
/**
 * Dans le cas d'une fonction, renvoie l'image de parametre par la fonction
 * @param {boolean} infoRandom  si true les calculs aléatoires par rand sont relancés
 * @param {string[]|null} parametres
 * @returns {number}
 */
CCalculAncetre.prototype.rendValeurFonction = function (infoRandom, parametres) {
  return this.rendValeur()
}
// A revoir javascript : sans doute inutile
/**
 * Dans le cas d'une fonction, renvoie l'image de parametre par la fonction
 * @param {boolean} infoRandom  si true les calculs aléatoires par rand sont relancés
 * @param {string[]} parametre  Tableau contenant le nom des paramètres.
 * @param {Complexe} zRes  Contient le résultat de f(parametre)
 * @returns {void}
 */
CCalculAncetre.prototype.rendValeurFonctionComplexe = function (infoRandom, parametre, zRes) {
}

/** @inheritDoc */
CCalculAncetre.prototype.read = function (inps, list) {
  CValDyn.prototype.read.call(this, inps, list)
  this.nomCalcul = inps.readUTF()
}

/** @inheritDoc */
CCalculAncetre.prototype.write = function (oups, list) {
  CValDyn.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomCalcul)
}
/**
 * Spécial JavaScript
 * Renvoie la valeur du calcul
 * @returns {number}
 */
CCalculAncetre.prototype.valeur = function () {
  return this.rendValeur()
}
/**
 * Spécial JavaScript
 * Renvoie la valeur complexe du calcul
 * @returns {Complexe}
 */
CCalculAncetre.prototype.valeurComplexe = function () {
  const res = new Complexe()
  this.rendValeurComplexe(res)
  return res
}
