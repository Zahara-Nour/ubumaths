/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroite from './CDemiDroite'
export default CDemiDroiteOA

/**
 * Demi-droite définir par son origine et un point.
 * @constructor
 * @extends CDemiDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @param {CPt} o  Le point origine de la demi-droite.
 * @param {CPt} a  Un point appartenant à la demi-droite.
 * @returns {CDemiDroiteOA}
 */
function CDemiDroiteOA (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, o, a) {
  if (arguments.length === 1) CDemiDroite.call(this, listeProprietaire)
  else {
    CDemiDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.o = o
    this.a = a
  }
}
CDemiDroiteOA.prototype = new CDemiDroite()
CDemiDroiteOA.prototype.constructor = CDemiDroiteOA
CDemiDroiteOA.prototype.superClass = 'CDemiDroite'
CDemiDroiteOA.prototype.className = 'CDemiDroiteOA'

CDemiDroiteOA.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.o)
  const ind2 = listeSource.indexOf(this.a)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CDemiDroiteOA(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(),
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'))
}
CDemiDroiteOA.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.o)
  liste.add(this.a)
}
CDemiDroiteOA.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = (this.o.existe) && (this.a.existe)
  if (!this.existe) return
  this.point_x = this.o.x
  this.point_y = this.o.y
  this.vect.x = this.a.x - this.o.x
  this.vect.y = this.a.y - this.o.y
  CDemiDroite.prototype.positionne.call(this, infoRandom, dimfen)
}
CDemiDroiteOA.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDemiDroite.prototype.depDe.call(this, p) || this.o.depDe(p) || this.a.depDe(p))
}
CDemiDroiteOA.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.o.dependDePourBoucle(p) || this.a.dependDePourBoucle(p))
}
CDemiDroiteOA.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.o === p.o) && (this.a === p.a))
  } else return false
}
CDemiDroiteOA.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.a === ancienPoint) this.a = nouveauPoint
}
CDemiDroiteOA.prototype.read = function (inps, list) {
  CDemiDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.o = list.get(ind1, 'CPt')
  this.a = list.get(ind2, 'CPt')
}
CDemiDroiteOA.prototype.write = function (oups, list) {
  CDemiDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.o)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.a)
  oups.writeInt(ind2)
}
