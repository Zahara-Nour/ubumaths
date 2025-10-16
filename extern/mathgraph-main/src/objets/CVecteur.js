/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import StyleFleche from '../types/StyleFleche'
import CSegment from './CSegment'
export default CVecteur

/**
 * Classe représentant un vecteur tracé sur le figure défini à l'aide de deux points
 * donnant l'origine et l'extrémité.
 * @constructor
 * @extends CSegment
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @param {CPt} point1  L'origine du vecteur.
 * @param {CPt} point2  L'extrémité du vecteur.
 * @param {StyleFleche} motifFleche  Donne le style utilisé pour la flèche.
 * @returns {CVecteur}
 */
function CVecteur (listeProprietaire, impProto, estElementFinal, couleur, masque, style, point1, point2, motifFleche) {
  if (arguments.length === 1) CSegment.call(this, listeProprietaire)
  else {
    CSegment.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style, point1, point2)
    this.motifFleche = motifFleche
  }
}
CVecteur.prototype = new CSegment()
CVecteur.prototype.constructor = CVecteur
CVecteur.prototype.superClass = 'CSegment'
CVecteur.prototype.className = 'CVecteur'
/**
 *
 * @param listeSource
 * @param listeCible
 * @returns {CVecteur}
 */
CVecteur.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.point1)
  const ind3 = listeSource.indexOf(this.point2)
  return new CVecteur(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind2, 'CPt'),
    listeCible.get(ind3, 'CPt'), this.motifFleche)
}
/**
 *
 * @param p
 * @returns {boolean}
 */
CVecteur.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.point1 === p.point1) && (this.point2 === p.point2)
  }
  return false
}
/**
 *
 * @returns {SVGElement}
 */
CVecteur.prototype.createg = function () {
  const g = cens('g', {
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  // var couleur = this.couleur.rgb(); Modifié version 4.9.9.4
  const couleur = this.color
  let style = ''
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += 'stroke:' + couleur + ';' // Modifié version 6.9.1
  style += 'stroke:' + couleur + ';opacity:' + this.couleur.opacity + ';'
  const g1 = CSegment.prototype.createg.call(this)
  g.appendChild(g1)
  g.appendChild(StyleFleche.creeFleche(this.x1, this.y1, this.x2, this.y2, this.motifFleche, this.listeProprietaire,
    couleur, style))
  return g
}
CVecteur.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CVecteur.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
/**
 *
 * @returns {Nat}
 */
CVecteur.prototype.getNature = function () {
  return NatObj.NVecteur
}
/**
 *
 * @returns {string}
 */
CVecteur.prototype.chaineDesignation = function () {
  return 'desVecteur'
}
CVecteur.prototype.read = function (inps, list) {
  CSegment.prototype.read.call(this, inps, list)
  this.motifFleche = inps.readByte()
}
CVecteur.prototype.write = function (oups, list) {
  CSegment.prototype.write.call(this, oups, list)
  oups.writeByte(this.motifFleche)
}
