/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { convDegRad, svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import Vect from '../types/Vect'
export default Gabarit

/**
 * Classe Gabarit de cercle (servant aussi à tracer les cercles)
 * L'objet gabarit va hériter de cet objet (secteur circulaire)
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
// Important : l'objet graphique (g element) sera initialisé avec comme centre l'origine
function Gabarit (doc, id, x, y, ray, ecartAngle, couleur, epaisseur, couleurFond, opacite) {
  Ligne.call(this, doc, id, couleur, epaisseur, opacite, 'continu')
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  this.ray = (ray === null) ? 10 : parseFloat(ray)
  this.ecartAngle = parseFloat(ecartAngle)
  this.couleur = couleur
  this.couleurFond = (couleurFond === null) ? couleur : couleurFond
  this.angle = 0 // On peut appliquer une rotation à cet objet
  this.objet = 'gabarit'
}

Gabarit.prototype = new Ligne()

// Le gabarit n'a pas d'animation quand on le crée contrairement à l'arc de cercle
Gabarit.prototype.creationAnimee = function () {
  return false
}

Gabarit.prototype.creeg = function () {
  const fin = this.ecartAngle
  const ray = this.ray
  const sens = (fin >= 0) ? '1' : '0' // 1 pour le sens des aiguilles d'une montre (direct pour le SVG)
  const ecart = Math.abs(fin)
  const g = document.createElementNS(svgns, 'g')

  const p = document.createElementNS(svgns, 'path')
  const u2 = new Vect(Math.cos(fin * convDegRad) * ray, Math.sin(fin * convDegRad) * ray)
  const xdeb = ray
  const ydeb = 0
  const xfin = u2.x
  const yfin = u2.y
  const path = 'M 0 0 L ' + xdeb + ' ' + ydeb + ' A ' + ray + ' ' + ray + ' 0 ' +
    ((ecart > 180) ? '1' : '0') + ' ' + sens + ' ' + xfin + ' ' + yfin + ' Z'
  p.setAttribute('d', path)
  const op = parseFloat(this.opacite / 100)
  const style = 'stroke:' + this.couleur + ';stroke-width:' + this.epaisseur + ';' + 'fill:' + this.couleurFond + ';fill-opacity:' + op + ';'
  p.setAttribute('style', style)
  g.appendChild(p)
  g.setAttribute('transform', 'translate(' + this.x + ',' + this.y + ') rotate(' + this.angle + ')')
  // g.setAttribute("id",this.id);
  g.setAttribute('visibility', 'hidden')
  this.g = g
}

Gabarit.prototype.donneRayon = function (ray) {
  this.ray = ray
  this.updateg()
  this.setPosition(this.x, this.y, this.angle)
}

Gabarit.prototype.setPosition = function (x, y, angle) {
  this.x = x
  this.y = y
  this.angle = angle
  this.g.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(' + angle + ')')
}

Gabarit.prototype.lanceAnimationModificationRayon = function (rayFin, pix10) {
  this.rayFin = rayFin
  this.rayInit = this.ray
  const dif = rayFin - this.ray
  this.dist = Math.abs(dif) // La distance entre la position actuelle et la position finale
  this.dray = Math.sign(dif) * Math.abs(pix10 / 4) // Dans la version JavaScript on quadruple la fréquence;
  // en divisant le pas par 4
  // (en fait par deux car la rapidité semble double de celle annoncée dans le mode d'emploi)
  // Cas où l'objet est déjà à la bonne position
  if (this.dist === 0) return
  // this.vect = v.vecteurColineaire(this.pix);
  const t = this
  this.timer = setInterval(function () { t.actionPourModificationRayon() }, 25)
}

Gabarit.prototype.actionPourModificationRayon = function () {
  const r = this.ray + this.dray
  const d = Math.abs(r - this.rayInit)
  if ((d > this.dist) || !this.doc.animationEnCours) {
    this.donneRayon(this.rayFin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.dist = d
    this.donneRayon(r)
  }
}
