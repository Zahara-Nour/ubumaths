/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CPointAncetrePointsMobiles

/**
 * Classe ancêtre de tous les points mobiles., point libres ou liés.
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
 * @param {boolean} fixed  true si le point est punaisé
 * @returns {void}
 */
function CPointAncetrePointsMobiles (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.fixed = fixed
  }
}
CPointAncetrePointsMobiles.prototype = new CPt()
CPointAncetrePointsMobiles.prototype.constructor = CPointAncetrePointsMobiles
CPointAncetrePointsMobiles.prototype.superClass = 'CPt'
CPointAncetrePointsMobiles.prototype.className = 'CPointAncetrePointsMobiles'
/**
 * Renvoie this.pointLibre qui est true si le point n'est pas punaisé.
 * @returns {boolean}
 */
CPointAncetrePointsMobiles.prototype.estLibre = function () { return !this.fixed }
/** @inheritedDoc */
CPointAncetrePointsMobiles.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  // Pour assurer la compatibilité avec les versions antérieures à la version 8.1 où on utilisait
  // la paramètre pointLibre qui est la négation de fixed, on a enregistré dans le flux !fixed
  this.fixed = !inps.readBoolean()
}
/** @inheritedDoc */
CPointAncetrePointsMobiles.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  // Pour assurer la compatibilité avec les versions antérieures à la version 8.1 où on utilisait
  // la paramètre pointLibre qui est la négation de fixed, on enregistre dans le flux !fixed
  oups.writeBoolean(!this.fixed)
}
