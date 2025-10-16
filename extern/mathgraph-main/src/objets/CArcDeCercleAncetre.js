/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import CCercle from './CCercle'
export default CArcDeCercleAncetre

/**
 * Classe ancêtre de tous les arcs de cercle.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  le style de tracé.
* @returns {CArcDeCercleAncetre}
 */
function CArcDeCercleAncetre (listeProprietaire, impProto, estElementFinal, couleur, masque, style) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CCercle.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
  }
  this.valeurAngleAuCentre = 0 // Nécessaire JavaScript pour CSurfaceSecteurCirculaire
}
CArcDeCercleAncetre.prototype = new CCercle()
CArcDeCercleAncetre.prototype.constructor = CArcDeCercleAncetre
CArcDeCercleAncetre.prototype.superClass = 'CCercle'
CArcDeCercleAncetre.prototype.className = 'CArcDeCercleAncetre'

CArcDeCercleAncetre.prototype.setClone = function (ptel) {
  CCercle.prototype.setClone.call(this, ptel)
  this.origine_x = ptel.origine_x
  this.origine_y = ptel.origine_y
  this.valeurAngleAuCentre = ptel.valeurAngleAuCentre
}
CArcDeCercleAncetre.prototype.getNature = function () {
  return NatObj.NArc
}
CArcDeCercleAncetre.prototype.createg = function () {
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';'  // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'

  style += 'fill:none'
  return cens('path', {
    d: this.path(),
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
}
CArcDeCercleAncetre.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && (memeMasque || !(this.masque && masquage)) && !this.horsFenetre
}
CArcDeCercleAncetre.prototype.horsCadre = function () {
  return this.horsFenetre
}
CArcDeCercleAncetre.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CArcDeCercleAncetre.prototype.update = function () {
  const g = this.g
  g.removeAttribute('d')
  g.setAttribute('d', this.path())
}
CArcDeCercleAncetre.prototype.chaineDesignation = function () {
  return 'desArc'
}
