/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import ObjetBase from '../objets/ObjetBase'
export default Point
/**
 * Classe représentant un objet de type point
 * A noter que point possèdera deux champs supplémentaires xcons et ycons
 * qui contiendront les coordonées du point au cours de la construction des autres objets
 * xcons et ycons seront modifiés lors d'une action de translation du point
 * pour que les objets l'utilisant comme cible soient correctement initialisés.
 * @extends ObjetBase
 * @constructor
 * @param {iepDoc} doc le document propriétaire
 * @param {string} id L'id de l'objet
 * @param {string} x l'abscisse initiale
 * @param {string} y l'ordonnée initiale
 * @param {string} couleur
 * @param {string} epaisseur
 */
function Point (doc, id, x, y, couleur, epaisseur) {
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  // Les deux variables suivantes servent à rétablir la figure dans son état initial quand on revien au début de la figure
  this.xinit = this.x
  this.yinit = this.y
  //
  this.xcons = this.x
  this.ycons = this.y
  Ligne.call(this, doc, id, couleur, epaisseur)
  this.style += 'stroke-linecap:round;' // Des bouts de croix arrondis
  this.nom = null // Un nom peut être affecté ultérieurement par une action nommer
  this.objet = 'point'
}
Point.prototype = new Ligne()
/** @inheritDoc */
Point.prototype.initialisePosition = function () {
  this.x = this.xinit
  this.y = this.yinit
  this.positionne()
}
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Point.prototype.creeg = function () {
  const lon = 5 // Longuueur en pixels d'un demi-trait
  const g = document.createElementNS(svgns, 'g')
  let li
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', -lon)
  li.setAttribute('y1', lon)
  li.setAttribute('x2', lon)
  li.setAttribute('y2', -lon)
  li.setAttribute('style', this.style)
  g.appendChild(li)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', -lon)
  li.setAttribute('y1', -lon)
  li.setAttribute('x2', lon)
  li.setAttribute('y2', lon)
  li.setAttribute('style', this.style)
  g.appendChild(li)
  // g.setAttribute("id",this.id);
  this.g = g
}
/** @inheritDoc */
Point.prototype.positionne = function () {
  this.g.setAttribute('transform', 'translate(' + this.x + ',' + this.y + ')')
}
/** @inheritDoc */
Point.prototype.translate = function (x, y) {
  this.x = x
  this.y = y
  this.positionne()
  if (this.nom !== null) this.nom.positionne()
}
/** @inheritDoc */
Point.prototype.updateg = function () {
  this.setPosition(this.x, this.y)
}
// Nécessaire de redéfinir montre car il peut y avoir un nom attaché au point
Point.prototype.montre = function (bvisible) {
  ObjetBase.prototype.montre.call(this, bvisible)
  if (this.nom !== null) if (this.nom.g) this.nom.montre(bvisible)
}
