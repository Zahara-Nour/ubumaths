/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CCentreCercle

/**
 * Objet point représentant le centre d'un cercle. Utilisé pour certaines constructions.
 * @constructor
 * @extends CPt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {CCercle} cercleAssocie  Le cercle dont on veut le centre.
 * @returns {CCentreCercle}
 */
function CCentreCercle (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, cercleAssocie) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.cercleAssocie = cercleAssocie
  }
}
CCentreCercle.prototype = new CPt()
CCentreCercle.prototype.constructor = CCentreCercle
CCentreCercle.prototype.superClass = 'CPt'
CCentreCercle.prototype.className = 'CCentreCercle'

CCentreCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.cercleAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CCentreCercle(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CCercle'))
}
CCentreCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.cercleAssocie.depDe(p))
}
CCentreCercle.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.cercleAssocie.dependDePourBoucle(p)
}
CCentreCercle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.cercleAssocie.existe
  if (this.existe) {
    CPt.prototype.placeEn.call(this, this.cercleAssocie.centreX, this.cercleAssocie.centreY)
    CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
  }
}
CCentreCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.cercleAssocie)
}
CCentreCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return this.cercleAssocie === p.cercleAssocie
  else return false
}
CCentreCercle.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.cercleAssocie = list.get(ind1, 'CCercle')
}
CCentreCercle.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.cercleAssocie)
  oups.writeInt(ind1)
}
