/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Modifié version 5.5.9 : CProduit descend de CSomme contrairement à la version Java
import NatCal from '../types/NatCal'
import CSomme from './CSomme'
export default CProduit

// Attention : Ordre des 3 derniers paramètres inversés par rapport à version Java
/**
 * Classe calculant la somme de la valeur de valeurAssomer suivant les valeurs
 * de la variable indice prenant ses valeurs de indiceMin jusquà indiceMax.
 * valeurAssommerpeut dépendre d'éléments graphiques.
 * Lors de chaque boucle, les éléments dépendant de la figure sont recalculés.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire
 * @param {CImplementationProto} impProto  null ou la construcction propriétaire
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom.
 * @param {CVariableBornee} indice  Le nome de la variable qui joue le rôel d'indice
 * @param {CValDyn} valeur
 * @param {CValeur} indiceMin
 * @param {CValeur} indiceMax
 * @returns {CProduit}
 */
function CProduit (listeProprietaire, impProto, estElementFinal, nomCalcul,
  indice, valeur, indiceMin, indiceMax) {
  if (arguments.length === 1) CSomme.call(this, listeProprietaire)
  else {
    CSomme.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, indice, valeur, indiceMin, indiceMax)
  }
}
CProduit.prototype = new CSomme()
CProduit.prototype.constructor = CProduit
CProduit.prototype.superClass = 'CSomme'
CProduit.prototype.className = 'CProduit'

CProduit.prototype.numeroVersion = function () {
  return 2
}

CProduit.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.indice)
  const ind2 = listeSource.indexOf(this.valeur)
  const ind3 = listeSource.indexOf(this.impProto)
  const indiceMinClone = this.indiceMin.getClone(listeSource, listeCible)
  const indiceMaxClone = this.indiceMax.getClone(listeSource, listeCible)
  const ptelb = new CProduit(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CVariableBornee'),
    listeCible.get(ind2, 'CValDyn'), indiceMinClone, indiceMaxClone)
  if (listeCible.className !== 'CPrototype') { ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire) }
  return ptelb
}

CProduit.prototype.getNatureCalcul = function () {
  return NatCal.NProduitIndice
}

CProduit.prototype.positionne = function (infoRandom, dimfen) {
  this.indiceMin.positionne(infoRandom, dimfen)
  this.indiceMax.positionne(infoRandom, dimfen)
  this.existe = this.indiceMin.existe && this.indiceMax.existe
  if (!this.existe) return
  // On arrondit les indices de départ et de fin à l'entier le plus proche
  // Modifié version 7.3 pour optimisation
  /*
  const indmin = Math.floor(this.indiceMin.rendValeur() + 0.5)
  const indmax = Math.floor(this.indiceMax.rendValeur() + 0.5)
   */
  const indmin = Math.round(this.indiceMin.rendValeur())
  const indmax = Math.round(this.indiceMax.rendValeur())
  this.existe = (indmin <= indmax) && ((indmax - indmin) < 5000)
  if (!this.existe) return
  const sauveIndice = this.indice.rendValeur()
  this.valeurProduit = 1
  for (let i = indmin; i <= indmax; i++) {
    this.indice.valeurActuelle = i
    this.listeElementsAncetres.positionneFull(infoRandom, dimfen)
    this.existe = this.existe && this.valeur.existe
    this.valeurProduit *= this.valeur.rendValeur()
  }
  this.indice.donneValeur(sauveIndice)
  this.listeElementsAncetres.metAJour()
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}
// AJout version 6.3.0
CProduit.prototype.positionneFull = function (infoRandom, dimfen) {
  this.indiceMin.dejaPositionne = false
  this.indiceMax.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CProduit.prototype.rendValeur = function () {
  return this.valeurProduit
}
