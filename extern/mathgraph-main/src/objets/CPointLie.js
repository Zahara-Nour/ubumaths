/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import { zero } from '../kernel/kernel'
import CPointAncetrePointsMobiles from './CPointAncetrePointsMobiles'
export default CPointLie

/**
 * @constructor
 * @extends CPointAncetrePointsMobiles
 * Classe ancêtre de tous les points liés
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
 * @param {number} abscisse  L'abscisse sur l'objet
 * @returns {void}
 */
function CPointLie (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CPointAncetrePointsMobiles.call(this, listeProprietaire)
  else {
    CPointAncetrePointsMobiles.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed)
    this.abscisse = abscisse
  }
}
CPointLie.prototype = new CPointAncetrePointsMobiles()
CPointLie.prototype.constructor = CPointLie
CPointLie.prototype.superClass = 'CPointAncetrePointsMobiles'
CPointLie.prototype.className = 'CPointLie'

CPointLie.prototype.setClone = function (ptel) {
  CPointAncetrePointsMobiles.prototype.setClone.call(this, ptel)
  this.abscisse = ptel.abscisse
}
/**
 * Fonction donnant au point l'abscisse ab sur l'objet auquel il est lié.
 * @param {number} ab
 * @returns {void}
 */
CPointLie.prototype.donneAbscisse = function (ab) {
  this.abscisse = ab
}

CPointLie.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return zero(this.abscisse - p.abscisse)
  else return false
}

CPointLie.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  return false
}

CPointLie.prototype.getNature = function () {
  return NatObj.NPointLie
}
/**
 * Fonction renvoyant true i le point est lié à une ligne fermée : cercle, polygône,
 * lieu de points fermé.
 * @returns {boolean}
 */
CPointLie.prototype.lieALigneFermee = function () {
  return false
}

CPointLie.prototype.read = function (inps, list) {
  CPointAncetrePointsMobiles.prototype.read.call(this, inps, list)
  this.abscisse = inps.readDouble()
}

CPointLie.prototype.write = function (oups, list) {
  CPointAncetrePointsMobiles.prototype.write.call(this, oups, list)
  oups.writeDouble(this.abscisse)
}
