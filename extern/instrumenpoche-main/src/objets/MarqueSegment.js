/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
export default MarqueSegment
/**
 * Objet représentant une marque de segment
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc Le document propriétaire
 * @param {string} id L'id de l'objet
 * @param {string} x L'abscisse
 * @param {string} y L'ordonnée
 * @param {string} couleur La couleur de tracé
 * @param {string} epaisseur L'épaisseur de tracé
 * @param {string} motif Donne le motif de la marque
 */
function MarqueSegment (doc, id, x, y, couleur, epaisseur, motif) {
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  this.motif = motif
  Ligne.call(this, doc, id, couleur, epaisseur, 100)
  this.objet = 'longueur'
}
MarqueSegment.prototype = new Ligne()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
MarqueSegment.prototype.creeg = function () {
  let g, li, k
  const demlong = 5
  const ec = 5 // demi écart horizontal entre deux traits
  const dec = ec / 2
  const diam = 5 // Diamètre du rond dans le cas où style == O
  switch (this.motif) {
    case '/' :
      g = document.createElementNS(svgns, 'line')
      g.setAttribute('x1', demlong)
      g.setAttribute('y1', -demlong)
      g.setAttribute('x2', -demlong)
      g.setAttribute('y2', demlong)
      g.setAttribute('style', this.style)
      break
    case '\\' :
      g = document.createElementNS(svgns, 'line')
      g.setAttribute('x1', -demlong)
      g.setAttribute('y1', -demlong)
      g.setAttribute('x2', demlong)
      g.setAttribute('y2', demlong)
      g.setAttribute('style', this.style)
      break
    case '//':
      g = document.createElementNS(svgns, 'g')
      for (k = -1; k <= 1; k += 2) {
        li = document.createElementNS(svgns, 'line')
        li.setAttribute('x1', k * dec + demlong)
        li.setAttribute('y1', -demlong)
        li.setAttribute('x2', k * dec - demlong)
        li.setAttribute('y2', demlong)
        li.setAttribute('style', this.style)
        g.appendChild(li)
      }
      break
    case '///':
      g = document.createElementNS(svgns, 'g')
      for (k = -1; k <= 1; k++) {
        li = document.createElementNS(svgns, 'line')
        li.setAttribute('x1', k * ec + demlong)
        li.setAttribute('y1', -demlong)
        li.setAttribute('x2', k * ec - demlong)
        li.setAttribute('y2', demlong)
        li.setAttribute('style', this.style)
        g.appendChild(li)
      }
      break
    case '\\\\':
      g = document.createElementNS(svgns, 'g')
      for (k = -1; k <= 1; k += 2) {
        li = document.createElementNS(svgns, 'line')
        li.setAttribute('x1', k * dec - demlong)
        li.setAttribute('y1', -demlong)
        li.setAttribute('x2', k * dec + demlong)
        li.setAttribute('y2', demlong)
        li.setAttribute('style', this.style)
        g.appendChild(li)
      }
      break
    case '\\\\\\':
      g = document.createElementNS(svgns, 'g')
      for (k = -1; k <= 1; k++) {
        li = document.createElementNS(svgns, 'line')
        li.setAttribute('x1', k * ec - demlong)
        li.setAttribute('y1', -demlong)
        li.setAttribute('x2', k * ec + demlong)
        li.setAttribute('y2', demlong)
        li.setAttribute('style', this.style)
        g.appendChild(li)
      }
      break
    case 'X': // Croix
      g = document.createElementNS(svgns, 'g')
      li = document.createElementNS(svgns, 'line')
      li.setAttribute('x1', -demlong)
      li.setAttribute('y1', -demlong)
      li.setAttribute('x2', demlong)
      li.setAttribute('y2', demlong)
      li.setAttribute('style', this.style)
      g.appendChild(li)
      li = document.createElementNS(svgns, 'line')
      li.setAttribute('x1', demlong)
      li.setAttribute('y1', -demlong)
      li.setAttribute('x2', -demlong)
      li.setAttribute('y2', demlong)
      li.setAttribute('style', this.style)
      g.appendChild(li)
      break
    case 'O': // Rond
      g = document.createElementNS(svgns, 'circle')
      g.setAttribute('cx', 0)
      g.setAttribute('cy', 0)
      g.setAttribute('r', diam)
      g.setAttribute('style', this.style + 'fill:none;')
      break
    default :
      g = document.createElementNS(svgns, 'g') // Vide en cas d'erreur
  }
  this.g = g
}
/** @inheritDoc */
MarqueSegment.prototype.positionne = function () {
  this.g.setAttribute('transform', 'translate(' + this.x + ',' + this.y + ')')
}
/** @inheritDoc */
MarqueSegment.prototype.translate = function (x, y) {
  this.x = x
  this.y = y
  this.positionne()
}
