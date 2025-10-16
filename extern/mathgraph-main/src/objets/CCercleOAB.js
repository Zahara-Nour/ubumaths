/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementLigne from './CElementLigne'
import CCercle from './CCercle'
import Vect from '../types/Vect'
export default CCercleOAB

/**
 * Ajout pour la version 6.0
 * Cercle défini par son centre et deux points dont la disatnce est le rayon.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la consruction proprietaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} o  Le centre du cercle.
 * @param {CPt} a  Pointe sur le premier point donnant le rayon.
 * @param {CPt} b  Pointe sur le deuxième point donnant le rayon.
 * @returns {CCercleOAB}
 */
function CCercleOAB (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, o, a, b) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.o = o
    this.a = a
    this.b = b
  }
}
CCercleOAB.prototype = new CCercle()
CCercleOAB.prototype.constructor = CCercleOAB
CCercleOAB.prototype.superClass = 'CCercle'
CCercleOAB.prototype.className = 'CCercleOAB'

CCercleOAB.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.impProto)
  const ind3 = listeSource.indexOf(this.a)
  const ind4 = listeSource.indexOf(this.b)
  return new CCercleOAB(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    listeCible.get(ind3, 'CPt'), listeCible.get(ind4, 'CPt'))
}
CCercleOAB.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
  liste.add(this.a)
  liste.add(this.b)
}

CCercleOAB.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCercle.prototype.depDe.call(this, p) ||
    this.o.depDe(p) || this.a.depDe(p) || this.b.depDe(p))
}
CCercleOAB.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.o.dependDePourBoucle(p) || this.r.dependDePourBoucle(p)) ||
    this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
}
CCercleOAB.prototype.positionne = function (infoRandom, dimfen) {
  // Modification version 4.6.3
  this.existe = this.o.existe && this.a.existe && this.b.existe
  if (this.existe) {
    this.centreX = this.o.x
    this.centreY = this.o.y
    const u = new Vect(this.a, this.b)
    this.rayon = u.norme()
    CCercle.prototype.positionne.call(this, infoRandom, dimfen)
  }
}

CCercleOAB.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.o === p.o) && ((this.a === p.a && this.b === p.b) || (this.a === p.b && this.b === p.a))
  } else return false
}
CCercleOAB.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
}
CCercleOAB.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  const ind2 = inps.readInt()
  this.a = list.get(ind2, 'CPt')
  const ind3 = inps.readInt()
  this.b = list.get(ind3, 'CPt')
}
CCercleOAB.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.a)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.b)
  oups.writeInt(ind3)
}
