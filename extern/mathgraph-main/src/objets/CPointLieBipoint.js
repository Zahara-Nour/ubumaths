/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CPointLieBipoint

/**
 * Point d'intersection de deux cercles ou d'une droite et un cercle
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
 * @param {CBipoint} ptBipoint  Le bipoint associé
 * @param {number} indiceDansBipoint  L'indice 1 ou 2 dans le bipoint
 * @returns {void}
 */
function CPointLieBipoint (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, ptBipoint, indiceDansBipoint) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.ptBipoint = ptBipoint
    this.indiceDansBipoint = indiceDansBipoint
  }
}
CPointLieBipoint.prototype = new CPt()
CPointLieBipoint.prototype.constructor = CPointLieBipoint
CPointLieBipoint.prototype.superClass = 'CPt'
CPointLieBipoint.prototype.className = 'CPointLieBipoint'

CPointLieBipoint.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.ptBipoint)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieBipoint(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CBipoint'), this.indiceDansBipoint)
}

CPointLieBipoint.prototype.ajouteAntecedents = function (liste) {
  this.ptBipoint.ajouteAntecedents(liste)
}

CPointLieBipoint.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.ptBipoint.depDe(p))
}

CPointLieBipoint.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.ptBipoint.dependDePourBoucle(p))
}

CPointLieBipoint.prototype.positionne = function (infoRandom, dimfen) {
  let ptp
  switch (this.indiceDansBipoint) {
    case 1:
      ptp = this.ptBipoint.point1
      break
    case 2:
      ptp = this.ptBipoint.point2
      break
  }
  this.existe = ptp.existe
  if (!this.existe) return
  CPt.prototype.placeEn.call(this, ptp.x, ptp.y)
  CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}

CPointLieBipoint.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  this.indiceDansBipoint = inps.readByte()
  const ind1 = inps.readInt()
  this.ptBipoint = list.get(ind1, 'CBipoint')
}

CPointLieBipoint.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  oups.writeByte(this.indiceDansBipoint)
  const ind1 = list.indexOf(this.ptBipoint)
  oups.writeInt(ind1)
}
