/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
import CSousListeObjets from './CSousListeObjets'
export default CSomme

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
 * @param {CValDyn} valeur La valeur à sommer
 * @param {CValeur} indiceMin
 * @param {CValeur} indiceMax
 * @returns {CSomme}
 */
function CSomme (listeProprietaire, impProto, estElementFinal, nomCalcul,
  indice, valeur, indiceMin, indiceMax) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.indice = indice
    this.valeur = valeur // S'appelle valeurASommer dans la version Java
    this.indiceMin = indiceMin
    this.indiceMax = indiceMax
  }
  this.listeElementsAncetres = new CSousListeObjets()
}
CSomme.prototype = new CCalculAncetre()
CSomme.prototype.constructor = CSomme
CSomme.prototype.superClass = 'CCalculAncetre'
CSomme.prototype.className = 'CSomme'

CSomme.prototype.numeroVersion = function () {
  return 2
}

CSomme.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.indice)
  const ind2 = listeSource.indexOf(this.valeur)
  const ind3 = listeSource.indexOf(this.impProto)
  const indiceMinClone = this.indiceMin.getClone(listeSource, listeCible)
  const indiceMaxClone = this.indiceMax.getClone(listeSource, listeCible)
  const ptelb = new CSomme(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CVariableBornee'),
    listeCible.get(ind2, 'CValDyn'), indiceMinClone, indiceMaxClone)
  if (listeCible.className !== 'CPrototype') { ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire) }
  return ptelb
}

CSomme.prototype.getNatureCalcul = function () {
  return NatCal.NSommeIndicee
}

CSomme.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.indiceMin.initialisePourDependance()
  this.indiceMax.initialisePourDependance()
}

CSomme.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.indice.depDe(p) ||
    this.valeur.depDe(p) || this.indiceMin.depDe(p) || this.indiceMax.depDe(p))
}

CSomme.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.indice.dependDePourBoucle(p) || this.valeur.dependDePourBoucle(p) ||
    this.indiceMin.dependDePourBoucle(p) || this.indiceMax.dependDePourBoucle(p)
}
CSomme.prototype.positionne = function (infoRandom, dimfen) {
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
  this.valeurSomme = 0
  // à revoir : faut-il que la variable de boucle soit double ?
  for (let i = indmin; i <= indmax; i++) {
    this.indice.valeurActuelle = i
    this.listeElementsAncetres.positionneFull(infoRandom, dimfen)
    this.existe = this.existe && this.valeur.existe
    this.valeurSomme += this.valeur.rendValeur()
  }
  this.indice.donneValeur(sauveIndice)
  this.listeElementsAncetres.metAJour()
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}
// Ajout version 6.3.0
CSomme.prototype.positionneFull = function (infoRandom, dimfen) {
  this.indiceMin.dejaPositionne = false
  this.indiceMax.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CSomme.prototype.rendValeur = function () {
  return this.valeurSomme
}

CSomme.prototype.etablitElementsAncetres = function () {
  this.listeElementsAncetres.retireTout()
  const list = this.listeProprietaire
  const indiceValeurASommer = list.indexOf(this.valeur)
  for (let i = 0; i <= indiceValeurASommer; i++) {
    const ptelb = list.get(i)

    if ((ptelb !== this.indice) && ptelb.depDe(this.indice) && this.valeur.depDe(ptelb)) { this.listeElementsAncetres.add(ptelb) }
  }
}

CSomme.prototype.metAJour = function () {
  this.etablitElementsAncetres()
}

CSomme.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  // Il faut créer la liste des éléments dont dépend le point à tracer
  // Pour cette liste, on fait pointer la longueur unité éventuelle sur la liste mère
  const ind1 = inps.readInt()
  this.indice = list.get(ind1, 'CVariableBornee')
  const ind2 = inps.readInt()
  this.valeur = list.get(ind2, 'CValDyn')
  this.indiceMin = new CValeur()
  this.indiceMin.read(inps, list)
  this.indiceMax = new CValeur()
  this.indiceMax.read(inps, list)
  // Modification pour la version 2.5.
  // Certaines choses pas à faire pour le chargement d'un prototype
  this.listeElementsAncetres.read(inps, list)
}

CSomme.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.indice)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.valeur)
  oups.writeInt(ind2)
  this.indiceMin.write(oups, list)
  this.indiceMax.write(oups, list)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
