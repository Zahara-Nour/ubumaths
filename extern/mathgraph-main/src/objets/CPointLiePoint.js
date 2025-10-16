/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CPt from './CPt'
export default CPointLiePoint

/**
 * Point lié à un point.
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
 * @param {CPt} pointAssocie  le point auquel le point est lié
 * @returns {void}
 */
function CPointLiePoint (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, pointAssocie) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.pointAssocie = pointAssocie
  }
}
CPointLiePoint.prototype = new CPt()
CPointLiePoint.prototype.constructor = CPointLiePoint
CPointLiePoint.prototype.superClass = 'CPt'
CPointLiePoint.prototype.className = 'CPointLiePoint'

CPointLiePoint.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLiePoint(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'))
}

CPointLiePoint.prototype.getNature = function () {
  return NatObj.NPointLiePoint
}

CPointLiePoint.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointAssocie)
}

CPointLiePoint.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.pointAssocie.depDe(p))
}

CPointLiePoint.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.pointAssocie.dependDePourBoucle(p)
}

CPointLiePoint.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.pointAssocie?.existe
  if (this.existe) {
    CPt.prototype.placeEn.call(this, this.pointAssocie.x, this.pointAssocie.y)
    CPt.prototype.positionne.call(this, infoRandom, dimfen)
  }
}

CPointLiePoint.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return (this.pointAssocie === p.pointAssocie)
  else return false
}
CPointLiePoint.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointAssocie === ancienPoint) this.pointAssocie = nouveauPoint
}

CPointLiePoint.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointAssocie = list.get(ind1, 'CPt')
}

CPointLiePoint.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointAssocie)
  oups.writeInt(ind1)
}
