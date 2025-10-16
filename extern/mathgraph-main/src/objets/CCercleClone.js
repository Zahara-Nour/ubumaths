/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementLigne from './CElementLigne'
import CCercle from './CCercle'
export default CCercleClone

/**
 * Classe représentant un clone d'un cercle déjà créé (pas un arc de cercle).
 * Il est identique mais peut avoir ses propres attributs graphiques.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la consruction proprietaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CCercle} cercle  Le cercle dont l'objet est le clone;
 * @returns {CCercleClone}
 */
function CCercleClone (listeProprietaire, impProto, estElementFinal,
  couleur, masque, style, cercle) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.cercle = cercle
  }
}
CCercleClone.prototype = new CCercle()
CCercleClone.prototype.constructor = CCercleClone
CCercleClone.prototype.superClass = 'CCercle'
CCercleClone.prototype.className = 'CCercleClone'

CCercleClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.cercle)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CCercleClone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CCercle'))
}

/* Abandonné version 6.9.1 : NatObj.NPCercleClone ne sert pas. Donc renvoie NatObj.NCercle
CCercleClone.prototype.getNature = function () {
  return NatObj.NCercleClone
}
 */

CCercleClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCercle.prototype.depDe.call(this, p) || this.cercle.depDe(p))
}
CCercleClone.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.cercle.dependDePourBoucle(p))
}
CCercleClone.prototype.positionne = function () {
  this.existe = this.cercle.existe
  if (this.existe) {
    const b = this.masque
    this.setClone(this.cercle)
    this.masque = b
  }
}
CCercleClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.cercle)
}
CCercleClone.prototype.confonduAvec = function () {
  return false
}
CCercleClone.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.cercle = list.get(ind1, 'CCercle')
}
CCercleClone.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.cercle)
  oups.writeInt(ind1)
}
