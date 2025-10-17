/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import Vect from '../types/Vect'
import Segment from './Segment'
export default MarqueSeg
/**
 * Objet représentant une marque de segment
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc Le document propriétaire
 * @param {string} id L'id de l'objet
 * @param {string} idSeg L'id du segment parnet
 * @param {string} couleur La couleur de tracé
 * @param {string} epaisseur L'épaisseur de tracé
 * @param {string} motif Donne le motif de la marque
 * @param {null|string} rayon Donne le rayon (demi-longueur de la marque). "5" si paramètre omis.
 */
function MarqueSeg (doc, id, idSeg, couleur, epaisseur, motif, rayon) {
  this.idSeg = idSeg
  this.motif = motif
  this.rayon = (rayon !== null) ? rayon : '5'
  Ligne.call(this, doc, id, couleur, epaisseur, 100)
  this.objet = 'marque'
}
MarqueSeg.prototype = new Ligne()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
MarqueSeg.prototype.creeg = function () {
  let g, li, k
  const seg = this.doc.getElement(this.idSeg, 'trait')
  if (seg instanceof Segment) {
    const demlong = this.rayon
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
  } else {
    console.log('Maque de segment non associée à un objet segment')
    g = document.createElementNS(svgns, 'g')
  }
  this.g = g
}

/** @inheritDoc */
MarqueSeg.prototype.positionne = function () {
  const seg = this.doc.getElement(this.idSeg, 'trait')
  const vect = new Vect(seg.x1, seg.y1, seg.x2, seg.y2)
  const xmil = (seg.x1 + seg.x2) / 2
  const ymil = (seg.y1 + seg.y2) / 2
  const ang = -vect.angle()
  this.g.setAttribute('transform', 'translate(' + xmil + ',' + ymil + ') rotate(' + ang + ') ')
}

/** @inheritDoc */
MarqueSeg.prototype.translate = function (x, y) {
  this.x = x
  this.y = y
  this.positionne()
}
