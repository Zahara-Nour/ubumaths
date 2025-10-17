/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
import Equerre from '../instruments/Equerre'
export default Requerre
/**
 * @constructor
 * @extends InstrumentAncetre
 * Classe représentant la régle-equerre dans la figure InstrumenPoche
 * @param {IepDoc} doc le document propriétaire de la figure
 */
function Requerre (doc) {
  InstrumentAncetre.call(this, doc)
  this.x = 200
  this.y = 400
  this.angle = 0
  this.zoomfactor = 1
  this.abscisse = 0 // L'abscisse au coin de l'équerre sur la règle
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle)
  doc.svg.appendChild(this.g)
}
Requerre.prototype = new InstrumentAncetre()
/**
 * Fonction mettant dans this.g l'élément graphique représentant la règle-équerre
 * dans le DOM du svg de la figure
 */
Requerre.prototype.creeg = function () {
  let p, path
  const longd = 172 // Longueur de la partie droite à partir de l'origine
  const longg = 256 // Longueur de la partie gauche à partir de l'origine
  const larg = 57 // La largeur
  const ray = 5 // Rayon de courbure des coins
  const largeurbande = 16 // Largeur des bandes plus claires
  const dectroud = 20
  const dectroub = 15
  const raytrou = 6
  const style = 'stroke:#999999;stroke-width:2; fill: #c6cbe8; fill-opacity: 0.5'

  // Ici on ne peut pas faire un rectangle aux bords arrondis si on veut le petit cercle
  // ajouré en bas et à droite

  const g = document.createElementNS(svgns, 'g')
  p = document.createElementNS(svgns, 'path')
  path = 'M 0 0 L ' + String(longd - ray) + ' 0 A ' +
          ray + ' ' + ray + ' 0 0 1 ' + String(longd) + ' ' + ray +
          ' L ' + String(longd) + ' ' + String(larg - ray) + ' A ' +
          ray + ' ' + ray + ' 90 0 1 ' + String(longd - ray) + ' ' + String(larg) +
          ' L ' + String(-longg + ray) + ' ' + larg + ' A ' + ray + ' ' + ray + ' 180 0 1 ' + '-' + longg + ' ' +
          String(larg - ray) + ' L ' + String(-longg) + ' ' + ray + ' A ' + ray + ' ' + ray +
          ' -90 0 1 ' + String(-longg + ray) + ' 0Z'
  // On rajoute le trou parcouru dans le sens inverse pour qu'il ne soit pas rempli
  // Forcément deux demi-cercles. Un cercle entier ne semble pas possible.
  const ytrou = larg - dectroub
  const pathtrou = 'M' + String(longd - dectroud + raytrou) + ' ' + ytrou + 'A ' +
          raytrou + ' ' + raytrou + ' 180 0 0 ' + String(longd - dectroud - raytrou) + ' ' + String(ytrou) +
          'A ' + raytrou + ' ' + raytrou + ' 180 0 0 ' + String(longd - dectroud + raytrou) + ' ' + String(ytrou)

  path += pathtrou
  p.setAttribute('d', path)
  p.setAttribute('style', style)
  g.appendChild(p)
  // On rajoute l'intérieur pour les bords soient plus clairs
  p = document.createElementNS(svgns, 'path')
  path = 'M' + String(longd) + ' ' + String(largeurbande) + 'L' +
          String(longd) + ' ' + String(larg - ray) + ' A ' +
          ray + ' ' + ray + ' 90 0 1 ' + String(longd - ray) + ' ' + String(larg) +
          ' L ' + String(-longg + ray) + ' ' + larg + ' A ' + ray + ' ' + ray + ' 180 0 1 ' + '-' + longg + ' ' +
          String(larg - ray) + ' L ' + String(-longg) + ' ' + String(largeurbande) + 'Z' + pathtrou
  p.setAttribute('d', path)
  p.setAttribute('style', style)
  g.appendChild(p)
  // Un trait de rappel pour l'origine
  const line = document.createElementNS(svgns, 'line')
  line.setAttribute('x1', 0)
  line.setAttribute('y1', 8)
  line.setAttribute('x2', 0)
  line.setAttribute('y2', 0)
  line.setAttribute('style', 'stroke: black')
  g.appendChild(line)
  // on utilise Equerre.prototype.creeg pour récupérer le svg d'une equerre,
  // sans passer par un new Equerre car on veut juste le svg
  // => on lui file un objet vide pour son this
  const fakeEquerre = {}
  Equerre.prototype.creeg.call(fakeEquerre)
  this.gequerre = fakeEquerre.g
  this.gequerre.setAttribute('transform', 'scale(0.7)')
  g.appendChild(this.gequerre)
  this.setAbs(this.abscisse)
  this.g = g
}
/**
 * Fonction faisant glisser l'équerre sur la règle jusqu'à l'abscisse abs
 * L'abscisse 0 est représentée par le petit trait sur la règle
 * @param {number} abs
 */
Requerre.prototype.setAbs = function (abs) {
  this.abscisse = abs
  this.gequerre.setAttribute('transform', 'translate(' + abs + ',0)')
}
/**
 * Fonction lançant une animation de glissement de l'équerre sur la règle
 * La règle équerre est le seul instrument à voir un mouvement autre que translation et rotation : Le glissement.
 * @param {number} absfin l'abscisse de l'équerre à la fin du glissement
 * @param {number} pix10 le nombre de pixels dont gilsse l'équerre
 * à chaque dixième de seconde.
 */
Requerre.prototype.lanceAnimationGlissement = function (absfin, pix10) {
  this.absfin = absfin
  this.pix = (absfin >= this.abscisse) ? pix10 / 4 : -pix10 / 4 // Dans la version JavaScript on quadruple la fréquence
  this.dist = Math.abs(absfin - this.abscisse)
  const t = this
  this.timer = setInterval(function () { t.actionPourGlissement() }, 25)
}
/**
 * Fonction appelée par un timer lors de l'aniamtion de glissement de l'équerre
 * sur la règle
 */
Requerre.prototype.actionPourGlissement = function () {
  const abs = this.abscisse + this.pix
  const dis = Math.abs(this.absfin - abs)
  if ((dis > this.dist) || !this.doc.animationEnCours) {
    this.setAbs(this.absfin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.dist = dis
    this.setAbs(abs)
  }
}
