/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { convDegRad, svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import CompasLeve from '../instruments/CompasLeve'
import Vect from '../types/Vect'
export default Arc
/**
 * Classe arc de cercle (servant aussi à tracer les cercles)
 * extends iep.objetBase
 * @constructor
 * @param {number} x abscisse du centre
 * @param {number} y Ordonnée du centre
 * @param {number} ray Le rayon
 * @param {number} debut L'angle de début de tracé
 * @param {number} fin L'angle de fin de tracé
 * @param {SvgColor} couleur La couleur
 * @param {number} epaisseur L'épaisseur du trait
 * @param {number} opacite L'opacité du tracé
 * @param {string} styleTrait "tiret" pour avoir des pointillés
 * Si debut < angle, l'arc est tracé dans le sens des ailluilles d'une montre, sinon dans le sens inverse
 */
// Important : l'objet graphque (g element) sera initialisé avec comme centre l'origine
function Arc (doc, id, x, y, ray, debut, fin, couleur, epaisseur, opacite, styleTrait) {
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  this.ray = parseFloat(ray)
  this.debut = parseFloat(debut)
  this.fin = parseFloat(fin)
  Ligne.call(this, doc, id, couleur, epaisseur, opacite, styleTrait)
}
Arc.prototype = new Ligne()

Arc.prototype.creeg = function () {
  const deb = this.debut
  const fin = this.fin
  const ray = this.ray
  const sens = (deb < fin) ? '1' : '0' // 1 pour le sens des aiguilles d'une montre (direct pour le SVG)
  const ecart = Math.abs(fin - deb)
  const g = document.createElementNS(svgns, 'g')
  if (ecart >= 359.9) { // Cas d'un cercle ou presque
    const circ = document.createElementNS(svgns, 'circle')
    circ.setAttribute('r', ray)
    circ.setAttribute('cx', 0)
    circ.setAttribute('cy', 0)
    circ.setAttribute('style', this.style + ';fill:none;')
    g.appendChild(circ)
  } else {
    const p = document.createElementNS(svgns, 'path')
    const u1 = new Vect(Math.cos(deb * convDegRad) * ray, Math.sin(deb * convDegRad) * ray)
    const u2 = new Vect(Math.cos(fin * convDegRad) * ray, Math.sin(fin * convDegRad) * ray)
    const xdeb = u1.x
    const ydeb = u1.y
    const xfin = u2.x
    const yfin = u2.y
    const path = 'M' + xdeb + ' ' + ydeb + 'A' + ray + ' ' + ray + ' ' + deb + ' ' +
      ((ecart > 180) ? '1' : '0') + ' ' + sens + ' ' + xfin + ' ' + yfin
    p.setAttribute('d', path)
    p.setAttribute('style', this.style + ';fill:none')
    g.appendChild(p)
  }
  g.setAttribute('transform', 'translate(' + this.x + ',' + this.y + ')')
  // g.setAttribute("id",this.id);
  g.setAttribute('visibility', 'hidden')
  this.g = g
}

Arc.prototype.creationAnimee = function () {
  return true
}
Arc.prototype.lanceAnimation = function (vitesse) {
  const compas = this.doc.compas
  if (this.doc.compasLeve == null) {
    this.doc.compasLeve = new CompasLeve(this.doc, compas.x, compas.y,
      compas.angle, compas.ecart)
  }
  const compasLeve = this.doc.compasLeve
  this.ray = this.doc.compas.ecart // Le rayon ne peut etre connu qu'au mancement de l'animation
  this.angfin = this.fin
  this.pasdeg = vitesse / 2 // Dans la version JavaScript on quadruple la fréquence mais on la double par rapport aux autres animations
  this.pasdeg *= (this.fin >= this.debut) ? 1 : -1 // 1 pour le sens direct svg;
  this.distang = Math.abs(this.fin - this.debut)
  this.fin = this.debut
  compas.setPosition(this.x, this.y, this.debut)
  compasLeve.setPosition(this.x, this.y, this.debut)
  const t = this
  this.timer = setInterval(function () { t.actionPourAnimation() }, 25)
}
Arc.prototype.actionPourAnimation = function () {
  const compas = this.doc.compas
  const compasLeve = this.doc.compasLeve
  this.fin += this.pasdeg
  const dis = Math.abs(this.angfin - this.fin)
  if ((dis > this.distang) || !this.doc.animationEnCours) {
    this.fin = this.angfin
    this.updateg()
    // compas.setPosition(this.x,this.y,this.fin);
    this.finAction()
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.distang = dis
    this.updateg()
    compas.setPosition(this.x, this.y, this.fin)
    if (compasLeve !== null) compasLeve.setPosition(this.x, this.y, this.fin)
  }
}

Arc.prototype.finAction = function () {
  this.doc.compas.setPosition(this.x, this.y, this.fin)
  if (this.doc.compasLeve !== null) this.doc.compasLeve.setPosition(this.x, this.y, this.fin)
}
