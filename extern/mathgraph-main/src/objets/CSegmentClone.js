/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSegment from './CSegment'
export default CSegmentClone

/**
 * Classe représentant le clone d'un segment déjà existant.
 * Il est la réplque exacte de celui qu'il clone mais peut avoir sa ppropre couleur
 * et son propre style de trait.
 * Principalement utilisé pour les constructtions itératives et récursives.
 * @constructor
 * @extends CSegment
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto
 * @param {boolean} estElementFinal true si objet final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque true si l'objet est masqué
 * @param {StyleTrait} style  Le style de tracé.
 * @param {CSegment} segment Le segment qui est cloné.
 * @returns {CSegmentClone}
 */
function CSegmentClone (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, segment) {
  if (arguments.length === 1) CSegment.call(this, listeProprietaire)
  else {
    CSegment.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, segment.point1, segment.point2)
    this.segment = segment
    // Lignes suivantes ajoutées version 6.9.1
    this.point1 = segment.point1
    this.point2 = segment.point2
  }
}
CSegmentClone.prototype = new CSegment()
CSegmentClone.prototype.constructor = CSegmentClone
CSegmentClone.prototype.superClass = 'CSegment'
CSegmentClone.prototype.className = 'CSegmentClone'

CSegmentClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.segment)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSegmentClone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(),
    listeCible.get(ind1, 'CSegment'))
}
/* Abandonné version 6.9.1. NatObj.NSegmentClone ne sert à rien donc getNature renvoie NatObj.NSegment
CSegmentClone.prototype.getNature = function () {
  return NatObj.NSegmentClone
}
 */
CSegmentClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSegment.prototype.depDe.call(this, p) || this.segment.depDe(p))
}
CSegmentClone.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.segment.dependDePourBoucle(p))
}
CSegmentClone.prototype.positionne = function () {
  this.existe = this.segment.existe
  if (this.existe) {
    const b = this.masque
    this.setClone(this.segment)
    this.masque = b
  }
}
CSegmentClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.segment)
}
// On peut créer autant de clones d'un même objet qu'on souhaite
CSegmentClone.prototype.confonduAvec = function () {
  return false
}
CSegmentClone.prototype.read = function (inps, list) {
  CSegment.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.segment = list.get(ind1, 'CSegment')
}
CSegmentClone.prototype.write = function (oups, list) {
  CSegment.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.segment)
  oups.writeInt(ind1)
}
