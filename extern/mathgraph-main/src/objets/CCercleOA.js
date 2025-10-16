/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CElementLigne from './CElementLigne'
import CCercle from './CCercle'
export default CCercleOA

/**
 * Cercle donné par son centre et un point du cercle.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la consruction proprietaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} o  le cntre du cercle.
 * @param {CPt} a  un point du cercle.
 * @returns {CCercleOA}
 */
function CCercleOA (listeProprietaire, impProto, estElementFinal,
  couleur, masque, style, o, a) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.o = o
    this.a = a
  }
}
CCercleOA.prototype = new CCercle()
CCercleOA.prototype.constructor = CCercleOA
CCercleOA.prototype.superClass = 'CCercle'
CCercleOA.prototype.className = 'CCercleOA'

CCercleOA.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.a)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CCercleOA(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'))
}
CCercleOA.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
}
CCercleOA.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCercle.prototype.depDe.call(this, p) || this.o.depDe(p) || this.a.depDe(p))
}
CCercleOA.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.o.dependDePourBoucle(p) || this.a.dependDePourBoucle(p))
}
CCercleOA.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = (this.o.existe) && (this.a.existe)
  if (!this.existe) return
  const u = new Vect()
  u.x = this.a.x - this.o.x
  u.y = this.a.y - this.o.y
  this.rayon = u.norme()
  this.centreX = this.o.x
  this.centreY = this.o.y
  CCercle.prototype.positionne.call(this, infoRandom, dimfen)
}
CCercleOA.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.o === p.o) && (this.a === p.a))
  } else return false
}
CCercleOA.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.a === ancienPoint) this.a = nouveauPoint
}
CCercleOA.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  this.a = list.get(ind2, 'CPt')
}
CCercleOA.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.a)
  oups.writeInt(ind2)
}
