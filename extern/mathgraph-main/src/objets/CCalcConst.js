/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalcul from './CCalcul'

export default CCalcConst
// Modifié version 6.8.0
/**
 * @constructor
 * @extends CCalcul
 * Classe représentant dans un arbre binaire un calcul constant réel.
 * Jusqu'à présent seulement utilisé pour la cosntante pi
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire.
 * @param {boolean} estElementFinal  true si est élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul constant
 * @param {string} chaineCalcul  La chaîne représentant le calcul constant
 * @param {CCb} calcul  Arbre binaire contenant le calcul constant
 * @returns {CCalcConst}
 */
function CCalcConst (listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul) {
  if (arguments.length === 1) CCalcul.call(this, listeProprietaire)
  else {
    CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul)
    this.calculeValeurConstante()
  }
}
CCalcConst.prototype = new CCalcul()
CCalcConst.prototype.constructor = CCalcConst
CCalcConst.prototype.superClass = 'CCalcul'
CCalcConst.prototype.className = 'CCalcConst'

CCalcConst.prototype.getClone = function (listeSource, listeCible) {
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.impProto)
  return new CCalcConst(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, calculClone)
}

CCalcConst.prototype.getNatureCalcul = function () {
  return NatCal.NCalculReelConstant
}

// Rajouté version MtgApp
CCalcConst.prototype.positionne = function () {
  this.existe = true
}
/**
 * Calcule la valeur de la cosntante qui ne peut être que pi dans cette version
 * @returns {void}
 */
CCalcConst.prototype.calculeValeurConstante = function () {
  // Les paramètres passés n'ont aucune importance.
  // On calcule la valeur de la cosntante qui ne peut être que pi dans cette version
  // Modifié version 6.80
  // CCalcul.prototype.positionne.call(this, false)
  this.resultat = this.calcul.valeur
}

CCalcConst.prototype.read = function (inps, list) {
  CCalcul.prototype.read.call(this, inps, list)
  this.calculeValeurConstante()
}
