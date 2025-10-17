/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default Regle
/**
 * @constructor
 * @extends InstrumentAncetre
 * Classe représentant la règle de la figure
 * @param {IepDoc} doc le document propriétaire de la figure
 */
function Regle (doc) {
  InstrumentAncetre.call(this, doc)
  this.x = 100
  this.y = 400
  this.angle = 0
  this.longueur = 15 // Longueur en cm. Peut être modifier par actionModifierLongueur
  // 30 pixels par cm
  this.graduationVisible = true
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle)
  doc.svg.appendChild(this.g)
}
Regle.prototype = new InstrumentAncetre()
/**
 * Fonction mettant dans this.g l'élément graphique représentant la règle
 * dans le DOM du svg de la figure
 */
Regle.prototype.creeg = function () {
  let li, text
  const hauteurPolice = 9
  const longint = this.longueur * 30 + 15
  const larg = 57
  const largeur = String(larg)
  const ray = 6 // Rayon de courbure des coins
  const rayon = String(ray)
  const g = document.createElementNS(svgns, 'g')
  const rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', -rayon - 1)
  rect.setAttribute('y', 0)
  rect.setAttribute('width', String(longint + ray + 1))
  rect.setAttribute('height', largeur)
  rect.setAttribute('rx', rayon)
  rect.setAttribute('ry', rayon)
  rect.setAttribute('style', 'stroke:#999999;stroke-width:2; fill: #c6cbe8; fill-opacity: 0.5;')
  g.appendChild(rect)
  const line = document.createElementNS(svgns, 'line')
  line.setAttribute('x1', -rayon)
  line.setAttribute('y1', 27)
  line.setAttribute('x2', longint)
  line.setAttribute('y2', 27)
  line.setAttribute('style', 'stroke:#999999;stroke-width:2;')
  g.appendChild(line)
  // On crée les graduations
  this.graduations = document.createElementNS(svgns, 'g')
  for (let i = 0; i <= this.longueur * 10; i++) {
    li = document.createElementNS(svgns, 'line')
    const x = 3 * i
    li.setAttribute('x1', x)
    li.setAttribute('y1', 0)
    li.setAttribute('x2', x)
    li.setAttribute('y2', i % 10 === 0 ? 12 : (i % 5 === 0 ? 9 : 6))
    if (i % 10 === 0) {
      text = document.createElementNS(svgns, 'text')
      text.setAttribute('pointer-events', 'none')
      text.appendChild(document.createTextNode(String(i / 10)))
      text.setAttribute('x', x)
      text.setAttribute('y', 12 + hauteurPolice)
      text.setAttribute('style', 'font-family: monospace;font-size: ' + hauteurPolice + 'pt;text-anchor:middle')
      this.graduations.appendChild(text)
    }
    li.setAttribute('style', 'stroke:black;stroke-width:0.7;')
    this.graduations.appendChild(li)
  }
  // On rajoute le texte Sesamath
  text = document.createElementNS(svgns, 'text')
  text.setAttribute('pointer-events', 'none')
  text.appendChild(document.createTextNode('Sésamath'))
  text.setAttribute('x', longint / 2 - ray - 3)
  text.setAttribute('y', largeur - 5)
  text.setAttribute('style', 'font-family: Arial;font-size: 8pt;font-weight:bold;fill: maroon;text-anchor:middle;')
  g.appendChild(text)
  g.appendChild(this.graduations)
  this.g = g
}
/**
 * Fonction mettant les graduations de la règle en mode visible
 * et les endnt visibles dans le svg si l'instrument y est visible
 * @param {boolean} bvisible
 */
Regle.prototype.montreGraduations = function (bvisible) {
  this.graduationVisible = bvisible
  this.graduations.setAttribute('visibility', this.visible ? (bvisible ? 'visible' : 'hidden') : 'hidden')
}
/**
 * Fonction montrant la régle ou la cachant suivant la valeur de bvisible
 * @param {boolean} bvisible
 */
Regle.prototype.montre = function (bvisible) {
  InstrumentAncetre.prototype.montre.call(this, bvisible)
  if (bvisible) { this.graduations.setAttribute('visibility', this.graduationVisible ? 'visble' : 'hidden') } else {
    this.graduations.setAttribute('visibility', 'hidden')
  }
}
/**
 * Fonction initialisant la position de la règle.
 * Si la longueur de la règle a été modifiée il faut la réinitialiser
 */
Regle.prototype.initialisePosition = function () {
  if (this.longueur !== 15) {
    this.longueur = 15
    const vis = this.visible
    const oldg = this.g
    this.creeg()
    this.g.setAttribute('visibility', vis ? 'visible' : 'hidden')
    this.doc.svg.replaceChild(this.g, oldg)
  }
  InstrumentAncetre.prototype.initialisePosition.call(this)
}
