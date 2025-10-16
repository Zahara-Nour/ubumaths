/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { intersectionDroitesSecantes } from '../kernel/kernel'
import CMarqueAngleAncetre from './CMarqueAngleAncetre'
export default CMarqueAngleDroit

/**
 * Classe représentant une marque d'angle droit.
 * @constructor
 * @extends CMarqueAngleAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Donne le style trait utilisé.
 * @param {StyleMarqueAngle} styleMarque  Donne le style de la marque.
 * @param {number} rayon  Le rayon de l'arc.
 * @param {CDroitePerpendiculaire} perp  La droite perpendiculaire
 * associée.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMarqueAngleDroit}
 */
function CMarqueAngleDroit (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, styleMarque, rayon, perp, fixed = false) {
  if (arguments.length === 1) CMarqueAngleAncetre.call(this, listeProprietaire)
  else {
    CMarqueAngleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, styleMarque, rayon, fixed)
    this.perp = perp
  }
}
CMarqueAngleDroit.prototype = new CMarqueAngleAncetre()
CMarqueAngleDroit.prototype.constructor = CMarqueAngleDroit
CMarqueAngleDroit.prototype.superClass = 'CMarqueAngleAncetre'
CMarqueAngleDroit.prototype.className = 'CMarqueAngleDroit'

CMarqueAngleDroit.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.perp)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMarqueAngleDroit(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), this.styleMarque, this.rayon,
    listeCible.get(ind1, 'CMarqueAngleDroit'), this.fixed)
}
CMarqueAngleDroit.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.perp)
}
CMarqueAngleDroit.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMarqueAngleAncetre.prototype.depDe.call(this, p) || this.perp.depDe(p))
}
CMarqueAngleDroit.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.perp.dependDePourBoucle(p))
}
CMarqueAngleDroit.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.perp.existe
  if (!this.existe) return
  const intersection = {}
  intersectionDroitesSecantes(this.perp.a.x, this.perp.a.y, this.perp.vect,
    this.perp.d.point_x, this.perp.d.point_y, this.perp.d.vect, intersection)
  this.centreX = intersection.x
  this.centreY = intersection.y
  this.perp.vect.setCopy(this.u)
  this.perp.d.vect.setCopy(this.v)
  this.ang1rad = this.u.angleRad()
  this.ang2rad = this.v.angleRad()
  this.prepareAngleDroit()
  CMarqueAngleAncetre.prototype.positionne.call(this, infoRandom, dimfen)
}
CMarqueAngleDroit.prototype.createg = function (svg, couleurFond) {
  return CMarqueAngleAncetre.prototype.creategAngleDroit.call(this)
}
CMarqueAngleDroit.prototype.update = function (svg, couleurFond) {
  const oldg = this.g
  const g = this.createg(svg, couleurFond)
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CMarqueAngleDroit.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return (this.perp === p.perp)
  else return false
}
CMarqueAngleDroit.prototype.read = function (inps, list) {
  CMarqueAngleAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.perp = list.get(ind1, 'CDroitePerpendiculaire')
}
CMarqueAngleDroit.prototype.write = function (oups, list) {
  CMarqueAngleAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.perp)
  oups.writeInt(ind1)
}
