/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { getTaille } from '../global'
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
export default Texte
/**
 * Classe représentant un texte.
 * L'écriture dans le texte se fait via des actionEcrireTexte
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc Le docmument propriétaire
 * @param {string} id L'id du texte
 * @param {string} x L'asbsisse d'affichage
 * @param {string} y L'ordonnée d'affichage
 */
function Texte (doc, id, x, y) {
  ObjetBase.call(this, doc, id, 'black')
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  // Il faut mémoriser la position initiale du texte car il peut avoir été traslaté ar l'animation
  // et quand on la relance il doit remprendre sa place initiale
  this.xinit = this.x
  this.yinit = this.y

  this.taille = 20
  this.angle = 0 // Possibilité de tourner un etxte (pas donnée avec la version Flash)
  this.texte = ''
  this.objet = 'texte'
}
Texte.prototype = new ObjetBase()

// Attention : POur un affichage de texte, il faut décaler vers le bas de la hauteur de la police pour
// garder la compatibilité avec le flash
Texte.prototype.positionne = function () {
  // var y = this.y + parseFloat(this.taille);
  // this.g.setAttribute("transform","translate(" + this.x + "," + y + ")");
  this.setPosition(this.x, this.y, this.angle, this.zoomfactor)
}
Texte.prototype.translate = function (x, y) {
  this.x = x
  this.y = y
  this.positionne()
}
/** @inheritDoc */
Texte.prototype.updateg = function (g) {
  const oldg = this.g
  if (!oldg) return console.error('Il faut appeler creeg avant updateg')
  this.doc.svg.replaceChild(g, oldg)
  this.g = g
  g.setAttribute('visibility', 'visible')
}
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Texte.prototype.creeg = function () {
  this.g = document.createElementNS(svgns, 'g')
}
/**
 * Fonction mettant le texte aux coordonnées (x,y) avec un angle angle et
 * un coefficient de zoom zoomfactor et modifiant la spoition du svg element qui
 * le représente dans le DOM du svg.
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {integer} zoomfactor
 * @returns {undefined}
 */
Texte.prototype.setPosition = function (x, y, angle, zoomfactor) {
  this.x = x
  this.y = y
  this.angle = angle
  this.zoomfactor = zoomfactor
  const taille = getTaille(this)
  const y2 = y + taille
  this.g.setAttribute('transform', 'scale(' + zoomfactor + ') translate(' +
    String(x / zoomfactor) + ',' + String(y2 / zoomfactor) + ') rotate(' + angle + ')')
}
