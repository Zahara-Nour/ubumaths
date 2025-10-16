/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroite from './CDemiDroite'
export default CDemiDroiteClone

/**
 * Demi-droite clonant une demi-droite déjà créée.
 * Elle est la réplique exace de la demi-droite colnée mais puet avoir ses
 * propres caractéristiques graphiques.
 * Utilisé pour les constructions récursives et itératives.
 * @constructor
 * @extends CDemiDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @param {CDemiDroite} demidroite  La demi-droite dont this est le clone.
 * @returns {CDemiDroiteClone}
 */
function CDemiDroiteClone (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, demidroite) {
  if (arguments.length === 1) CDemiDroite.call(this, listeProprietaire)
  else {
    CDemiDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.demidroite = demidroite
  }
}
CDemiDroiteClone.prototype = new CDemiDroite()
CDemiDroiteClone.prototype.constructor = CDemiDroiteClone
CDemiDroiteClone.prototype.superClass = 'CDemiDroite'
CDemiDroiteClone.prototype.className = 'CDemiDroiteClone'

CDemiDroiteClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.demidroite)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CDemiDroiteClone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CDemiDroite'))
}
/* Abandonné version 6.9.1 : NatObj.NDemiDroiteClone ne sert pas. Donc renvoie NatObj.NDemiDroite
CDemiDroiteClone.prototype.getNature = function () {
  return NatObj.NDemiDroiteClone
}
 */
CDemiDroiteClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.demidroite)
}
CDemiDroiteClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDemiDroite.prototype.depDe.call(this, p) || this.demidroite.depDe(p))
}
CDemiDroiteClone.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.demidroite.dependDePourBoucle(p))
}
CDemiDroiteClone.prototype.positionne = function () {
  this.existe = this.demidroite.existe
  if (this.existe) {
    const b = this.masque
    this.setClone(this.demidroite)
    this.masque = b
  }
}
CDemiDroiteClone.prototype.confonduAvec = function () {
  return false
}
CDemiDroiteClone.prototype.read = function (inps, list) {
  CDemiDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.demidroite = list.get(ind1, 'CDemiDroite')
}
CDemiDroiteClone.prototype.write = function (oups, list) {
  CDemiDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.demidroite)
  oups.writeInt(ind1)
}
