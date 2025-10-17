/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default Crayon
/**
 * Classe représentant le crayon de la figure.
 * (this.x,this.y) sont les coordonnées de la pointe de la mine
 * this.angle est l'angle du corps du crayon par rapport à l'horizontale.
 * @constructor
 * @extends InstrumentAncetre
 * @param {IepDoc} doc le document propriétaire de la figure
 */
function Crayon (doc) {
  InstrumentAncetre.call(this, doc)
  this.angle = this.angleInit()
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle)
  doc.svg.appendChild(this.g)
}
Crayon.prototype = new InstrumentAncetre()

/**
 * extends iep.instruementAncetre
 */
Crayon.prototype.angleInit = function () {
  return -40
}
/**
 * Fonction mettant dans this.g l'élément graphique représentant le crayon
 * dans le DOM du svg de la figure
 */
Crayon.prototype.creeg = function () {
  let defs, p, path, lg, stop
  const lon = 97 // La longueur totale (sans le demi-cercle final)
  const longpointe = 15 // La longueur de la mine
  const demlarg = 4.5 // La demi-largeur du crayon
  const longmine = 3
  const demlargmine = longmine / longpointe * demlarg

  const g = document.createElementNS(svgns, 'g')
  // On crée un gradiant linéaire pour la mine
  // Il est nécessaire d'englober le gradient dans un defs pour pouvoir l'utiliser via url(#grad) plus tard
  defs = document.createElementNS(svgns, 'defs')
  lg = document.createElementNS(svgns, 'linearGradient')
  lg.setAttribute('id', 'gradpointe')
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '0%')
  stop.setAttribute('style', 'stop-color: #f00000;')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '50%')
  stop.setAttribute('style', 'stop-color: #eeb444;')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '100%')
  stop.setAttribute('style', 'stop-color: #f00000')
  lg.appendChild(stop)
  lg.setAttribute('x1', '0%')
  lg.setAttribute('y1', '0%')
  lg.setAttribute('x2', '0%')
  lg.setAttribute('y2', '100%')
  defs.appendChild(lg)
  g.appendChild(defs)
  // Un autre gradiant pour le corps du crayon
  defs = document.createElementNS(svgns, 'defs')
  lg = document.createElementNS(svgns, 'linearGradient')
  lg.setAttribute('id', 'gradcorps')
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '0%')
  stop.setAttribute('style', 'stop-color: #810216;')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '25%')
  stop.setAttribute('style', 'stop-color: #c64f00;')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '50%')
  stop.setAttribute('style', 'stop-color: #ab4a36')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '75%')
  stop.setAttribute('style', 'stop-color: #c64f00;')
  lg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '100%')
  stop.setAttribute('style', 'stop-colr: #810216;')
  lg.appendChild(stop)
  lg.setAttribute('x1', '0%')
  lg.setAttribute('y1', '0%')
  lg.setAttribute('x2', '0%')
  lg.setAttribute('y2', '100%')
  defs.appendChild(lg)
  g.appendChild(defs)

  // D'abord la mine
  p = document.createElementNS(svgns, 'path')
  const rx = demlarg / 3
  const ry = rx * 3 / 4
  const path1 = 'A' + rx + ' ' + ry + ' -90 0 0 ' +
          longpointe + ' ' + String(rx) + 'A' + rx + ' ' + ry + ' -90 0 1 ' +
          +longpointe + ' ' + String(-rx) + 'A' + rx + ' ' + ry + ' -90 0 0 ' +
          +longpointe + ' ' + String(-demlarg)
  path = 'M 0 0 L' + longpointe + ' ' + demlarg + path1 + 'Z'

  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black; stroke-width:0.5; fill: url(#gradpointe); fill-opacity: 1;')
  g.appendChild(p)
  // La pointe noire
  p = document.createElementNS(svgns, 'path')
  path = 'M 0 0 L ' + longmine + ' ' + demlargmine + ' ' + longmine + ' ' +
          String(-demlargmine) + 'Z'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black; stroke-width:0.5; fill: black; fill-opacity: 1;')
  g.appendChild(p)
  // Le corps du crayon
  p = document.createElementNS(svgns, 'path')
  path = 'M ' + longpointe + ' ' + demlarg + path1 + ' L ' + lon + ' ' + String(-demlarg) +
          ' L ' + lon + ' ' + String(demlarg) + 'Z'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black; stroke-width:0.5; fill: url(#gradcorps); fill-opacity: 1;')
  g.appendChild(p)
  // Le cercle bleu du bout
  const circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('r', demlarg)
  circ.setAttribute('cx', lon)
  circ.setAttribute('cy', 0)
  circ.setAttribute('style', 'stroke:blue; stroke-width:0.5; fill: blue; fill-opacity: 1;')
  g.appendChild(circ)
  this.g = g
}
