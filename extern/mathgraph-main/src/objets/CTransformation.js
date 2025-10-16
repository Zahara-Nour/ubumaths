/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CElementBase from './CElementBase'
export default CTransformation

/**
 * Classe ancêtre de toutes les transformations géométriques.
 * @constructor
 * @extends CElementBase
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @returns {CTransformation}
 */
function CTransformation (listeProprietaire, impProto, estElementFinal) {
  if (arguments.length === 0) return // Ajout version WebPack
  if (arguments.length === 1) CElementBase.call(this, listeProprietaire)
  else {
    CElementBase.call(this, listeProprietaire, impProto, estElementFinal)
  }
}
CTransformation.prototype = new CElementBase()
CTransformation.prototype.constructor = CTransformation
CTransformation.prototype.superClass = 'CElementBase'
CTransformation.prototype.className = 'CTransformation'

CTransformation.translation = 1
CTransformation.rotation = 1 << 1 // 2 puissance1=2;
CTransformation.symetrieCentrale = 1 << 2
CTransformation.symetrieAxiale = 1 << 3
CTransformation.homothetie = 1 << 4
CTransformation.similitude = 1 << 5
CTransformation.inversion = 1 << 6
CTransformation.translationParCoord = 1 << 7
CTransformation.translationParVect = 1 << 8
CTransformation.tteTrans = CTransformation.translation | CTransformation.translationParCoord | CTransformation.translationParVect // Rajout version 6.0
// Transformations transformant une droite en une droite parallèle Rajout version 5.8
CTransformation.tteTransImDtePar = CTransformation.symetrieCentrale | CTransformation.homothetie | CTransformation.tteTrans

CTransformation.prototype.getNature = function () {
  return NatObj.NTransformation
}
/**
 * Renvoie true si l'image de point existe
 * @param {CPt} point
 * @returns {boolean}
 */
CTransformation.prototype.pointAUneImage = function (point) {
  return true
}
/**
 * Au retoour, pointeur.getValue renvoie la valeur de l'image de l'angle ang
 * par la transformation.
 * Par défaut pointeur.getValue() renverra la valeur de ang car les transformations utilisées
 * sont des isométries directes.
 * Doit être redéfini pour la symétrie axiale.
 * @param {number} ang
 * @param {Pointeur} pointeur
 * @returns {void}
 */
CTransformation.prototype.transformeAngle = function (ang, pointeur) {
  pointeur.setValue(ang)
}
/**
 * Renvoie l'image de la longueur L par la transformation.
 * Par défaut conserve les longueurs. A modifier pour homothéties et simmilitudes.
 * @param {number} l  La longueur à transformer (positive)
 * @returns {number}
 */
CTransformation.prototype.transformeLongueur = function (l) {
  return l
}
