/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default CompasLeve
/**
 * @constructor
 * @extends InstrumentAncetre
 * Classe représentant le compas vu du dessus.
 * Attention : Contrairement au compas normal, le compas levé doit être reconstruit à  chaque fois
 * que son écartement est modifié.
 */
function CompasLeve (doc, x, y, angle, ecart) {
  InstrumentAncetre.call(this, doc)
  const oldg = (doc.compasLeve == null) ? null : doc.compasLeve.g
  this.x = x
  this.y = y
  this.angle = angle
  this.ecart = ecart
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(x, y, angle)
  if (oldg == null) doc.svg.appendChild(this.g)
  else doc.svg.replaceChild(this.g, oldg)
}
CompasLeve.prototype = new InstrumentAncetre()
/**
 * Fonction mettant dans this.g l'élément graphique représentant le compas
 * levé dans le DOM du svg contenant la figure.
 */
CompasLeve.prototype.creeg = function () {
  let rect, li, p
  const ep = 7 // Epaisseur des branches. La même que dans compas.
  const longpointe = 8 // Longueur de la pointe et des mines
  const ecart = this.ecart

  const g = document.createElementNS(svgns, 'g')
  if (this.ecart > 2 * longpointe) {
    rect = document.createElementNS(svgns, 'rect')
    rect.setAttribute('x', longpointe)
    rect.setAttribute('y', -ep / 2)
    rect.setAttribute('width', this.ecart - 2 * longpointe)
    rect.setAttribute('height', ep)
    rect.setAttribute('rx', 1)
    rect.setAttribute('ry', 1)
    rect.setAttribute('style', 'stroke:black;stroke-width:0.5;fill:silver;fill-opacity:1')
    g.appendChild(rect)
  }
  p = document.createElementNS(svgns, 'path')
  p.setAttribute('d', 'M0 0 L' + longpointe + ' 1 ' + longpointe + ' -1Z')
  p.setAttribute('style', 'stroke:black;stroke-width:0.5;fill:black;fill-opacity:1')
  g.appendChild(p)
  const d = ecart - 2 * longpointe
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', longpointe)
  li.setAttribute('y1', 0)
  li.setAttribute('x2', longpointe + d / 8)
  li.setAttribute('y2', 0)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  p = document.createElementNS(svgns, 'path')
  const e = String(ecart - longpointe)
  p.setAttribute('d', 'M' + ecart + ' 0 L' + e + ' 1.5 ' + e + ' -1.5Z')
  p.setAttribute('style', 'stroke:black;stroke-width:0.5;fill:black;fill-opacity:1')
  g.appendChild(p)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', e)
  li.setAttribute('y1', 0)
  li.setAttribute('x2', String(ecart - longpointe - d / 8))
  li.setAttribute('y2', 0)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  li = document.createElementNS(svgns, 'line')
  let f = String(ecart - longpointe - d / 8 - 2)
  li.setAttribute('x1', f)
  li.setAttribute('y1', -ep / 2)
  li.setAttribute('x2', f)
  li.setAttribute('y2', ep / 2)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  li = document.createElementNS(svgns, 'line')
  f = String(ecart - longpointe - d / 3 - 2)
  li.setAttribute('x1', f)
  li.setAttribute('y1', -ep / 2)
  li.setAttribute('x2', f)
  li.setAttribute('y2', ep / 2)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  // Les boutons vus en perspective
  rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', String(longpointe + d / 8 - 5))
  rect.setAttribute('y', String(-ep))
  rect.setAttribute('width', 8)
  rect.setAttribute('height', 3)
  rect.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  g.appendChild(rect)
  rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', String(ecart - longpointe - d / 8 - 4))
  rect.setAttribute('y', String(-ep))
  rect.setAttribute('width', 8)
  rect.setAttribute('height', 3)
  rect.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  g.appendChild(rect)

  // Le dessus
  const dl = 12 // Demi-largeur de la partie centrale grise
  const dh = 4 // Demi-hauteur de la partie centrale grise
  p = document.createElementNS(svgns, 'path')
  const path = 'M' + String(ecart / 2 + dl) + ' ' + String(-dh) + ' A ' + String(dl) +
          ' 2 180 0 0 ' + String(ecart / 2 - dl) + ' ' + String(-dh) + 'A' +
          String(dh) + ' 2 90 0 1 ' + String(ecart / 2 - dl) + ' ' + String(dh) + 'A' +
          String(dl) + ' 2 0 0 0 ' + String(ecart / 2 + dl) + ' ' + String(dh) + 'A' +
          String(dh) + ' 2 -90 0 1 ' + String(ecart / 2 + dl) + ' ' + String(-dh)
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: #666666; fill-opacity: 1')
  g.appendChild(p)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', String(ecart / 2 + dl))
  li.setAttribute('y1', -ep / 2)
  li.setAttribute('x2', String(ecart / 2 - dl))
  li.setAttribute('y2', ep / 2)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', String(ecart / 2 - dl))
  li.setAttribute('y1', -ep / 2)
  li.setAttribute('x2', String(ecart / 2 + dl))
  li.setAttribute('y2', ep / 2)
  li.setAttribute('style', 'stroke: black; stroke-width:0.5;')
  g.appendChild(li)
  const circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', String(ecart / 2))
  circ.setAttribute('cy', 0)
  circ.setAttribute('r', 5)
  circ.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: #666666; fill-opacity: 1')
  g.appendChild(circ)
  // Les boutons vus en perspective
  rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', String(longpointe + d / 8 - 5))
  rect.setAttribute('y', String(-ep))
  rect.setAttribute('width', 7)
  rect.setAttribute('height', 3)
  rect.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  g.appendChild(rect)
  rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', String(ecart - longpointe - d / 8 - 4))
  rect.setAttribute('y', String(-ep))
  rect.setAttribute('width', 7)
  rect.setAttribute('height', 3)
  rect.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  g.appendChild(rect)
  this.g = g
}
/**
 * Fonction mettant le svg element représentant le compas levé à la position (x,y)
 * avec un angle avce l'horizontale égal à angle
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 */
CompasLeve.prototype.setPosition = function (x, y, angle) {
  this.x = x
  this.y = y
  this.angle = angle
  this.g.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(' + angle + ')')
}
