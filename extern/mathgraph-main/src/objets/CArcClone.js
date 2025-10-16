/*
* MathGraph32 Javascript : Software for animating online dynamic mathematics figures
* https://www.mathgraph32.org/
* @Author Yves Biton (yves.biton@sesamath.net)
* @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
  */
import CArcDeCercleAncetre from './CArcDeCercleAncetre'
export default CArcClone

/**
 * Classe représentant un arc de cercle clone d'un arc déjà existant
 * @param listeProprietaire
 * @param impProto
 * @param estElementFinal
 * @param couleur
 * @param masque
 * @param style
 * @param arc
 * @constructor
 * @extends CArcDeCercleAncetre
 */
function CArcClone (listeProprietaire, impProto, estElementFinal, couleur, masque, style, arc) {
  if (arguments.length === 1) CArcDeCercleAncetre.call(this, listeProprietaire)
  else {
    CArcDeCercleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.arc = arc
  }
}
CArcClone.prototype = new CArcDeCercleAncetre()
CArcClone.prototype.constructor = CArcClone
CArcClone.prototype.superClass = 'CArcDeCercleAncetre'
CArcClone.prototype.className = 'CArcClone'

CArcClone.prototype.path = function () {
  return this.arc.path()
}
CArcClone.prototype.natureArc = function () {
  return this.arc.natureArc()
}
CArcClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.arc)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CArcClone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CArcDeCercleAncetre'))
}
CArcClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.arc)
}
CArcClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CArcDeCercleAncetre.prototype.depDe.call(this, p) || this.arc.depDe(p))
}
CArcClone.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.arc.dependDePourBoucle(p))
}
CArcClone.prototype.positionne = function () {
  this.existe = this.arc?.existe
  if (this.existe) {
    const b = this.masque
    this.setClone(this.arc)
    this.masque = b
  }
}
// On peut créer autant de clones d'un même objet qu'on souhaite
CArcClone.prototype.confonduAvec = function () {
  return false
}
CArcClone.prototype.read = function (inps, list) {
  CArcDeCercleAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.arc = list.get(ind1, 'CArcDeCercleAncetre')
}
CArcClone.prototype.write = function (oups, list) {
  CArcDeCercleAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.arc)
  oups.writeInt(ind1)
}
