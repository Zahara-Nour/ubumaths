/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import { zero } from '../kernel/kernel'
import CPointLie from './CPointLie'
export default CPointLieLieuAncetre

/**
 * Classe ancêtre de tous les points liés à un lieu de points.
 * @constructor
 * @extends CPointLie
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
 * @param {boolean} fixed  true si le point est punaisé
 * @param {number} abscisse  L'abscisse du point sur l'objet
 * @param {CLieuDeBase} lieuAssocie  Le lieu de points
 * @returns {void}
 */
function CPointLieLieuAncetre (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse, lieuAssocie) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CPointLie.call(this, listeProprietaire)
  else {
    CPointLie.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse)
    this.lieuAssocie = lieuAssocie
  }
}
CPointLieLieuAncetre.prototype = new CPointLie()
CPointLieLieuAncetre.prototype.constructor = CPointLieLieuAncetre
CPointLieLieuAncetre.prototype.superClass = 'CPointLie'
CPointLieLieuAncetre.prototype.className = 'CPointLieLieuAncetre'

CPointLieLieuAncetre.prototype.getNature = function () {
  return NatObj.NPointLie
}

CPointLieLieuAncetre.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.lieuAssocie)
}

CPointLieLieuAncetre.prototype.depDe = function (p) {
  return CPointLie.prototype.depDe.call(this, p) || this.lieuAssocie.depDe(p)
}

CPointLieLieuAncetre.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.lieuAssocie.dependDePourBoucle(p)
}

CPointLieLieuAncetre.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return zero(this.abscisse - p.abscisse)
  } else return false
}

CPointLieLieuAncetre.prototype.read = function (inps, list) {
  CPointLie.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.lieuAssocie = list.get(ind1, 'CLieuDeBase')
  this.abscisse = inps.readDouble()
}

CPointLieLieuAncetre.prototype.write = function (oups, list) {
  CPointLie.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.lieuAssocie)
  oups.writeInt(ind1)
  oups.writeDouble(this.abscisse)
}
