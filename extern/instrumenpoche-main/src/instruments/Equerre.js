/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default Equerre
/**
 * Objet représentant l'équerre de la figure.
 * @constructor
 * @extends InstrumentAncetre
 * (this.x,this.y)  sont les coordonnées du sommet de l'équerre
 * this.angle est l'angle que fait l'équerre avec l'horizontale.
 * @param {IepDoc} doc le document propriétaire de la figure
 */
function Equerre (doc) {
  InstrumentAncetre.call(this, doc)
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle)
  doc.svg.appendChild(this.g)
}
Equerre.prototype = new InstrumentAncetre()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'équerre
 * dans le DOM du svg qui contient la figure
 * @returns {g}
 */
Equerre.prototype.creeg = function () {
  let p, path
  const largeur = 131
  const hauteur = 223
  const largeurbas = 31
  const largeurgauche = 24
  const largeurint = 61
  const hauteurint = largeurint * hauteur / largeur
  const largeurbande = 16 // pour la partie plus claire en bas et à gauche.
  const h = hauteur / largeur * (largeur - largeurbande) // Hauteur basse de la partie plus claire
  const l = largeur / hauteur * (hauteur - largeurbande)

  const g = document.createElementNS(svgns, 'g')
  // D'abord le pourtour
  p = document.createElementNS(svgns, 'path')
  // Pourtour exterieur
  path = 'M 0 0 L ' + largeur + ' 0 L 0 ' + String(-hauteur) + ' Z'
  // Pourtout intérieur qui doit être parcouru dans l'autre sens pour le remplissage
  const path2 = 'M ' + largeurgauche + ' ' + String(-largeurbas) + ' L ' + largeurgauche + ' ' +
          String(-largeurbas - hauteurint) + ' L ' + String(largeurgauche + largeurint) +
          ' ' + String(-largeurbas) + ' Z'
  path += path2
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: #c6cbe8; fill-opacity: 0.5')
  g.appendChild(p)
  // On repasse l'intérieur pour laisser une bande plus claire sur les côtés
  p = document.createElementNS(svgns, 'path')
  path = 'M ' + largeurbande + ' ' + String(-largeurbande) + ' L ' + l + ' ' +
          String(-largeurbande) + ' L ' + largeurbande + ' ' + (-h) + ' Z'
  path += path2
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke-width:0; fill: #c6cbe8; fill-opacity: 0.5')
  g.appendChild(p)
  // On rajoute le texte Sesamath dans la barre du bas
  const text = document.createElementNS(svgns, 'text')
  text.setAttribute('pointer-events', 'none')
  text.appendChild(document.createTextNode('Sésamath'))
  text.setAttribute('x', largeurgauche)
  text.setAttribute('y', -largeurbande / 2 - 5)
  text.setAttribute('style', 'font-family: Arial;font-size: 8pt;font-weight:bold;fill: maroon')
  g.appendChild(text)
  this.g = g
}
