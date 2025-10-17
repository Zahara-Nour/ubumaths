/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
export default Quadrillage
/**
 * Classe représentant un quadrillage de la figure
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc Le document propriétaire
 * @param {string} type Le type de quadrillage : "quadrillage","seyes","5x5","10x10","millimetre"
 * @param {string} hauteur La hauteur du cadre en cm (1 cm = 30 pixels)
 * @param {string} largeur La largeur du cadre en cm (1 cm = 30 pixels)
 * @param {string} haut La position en ordonnées du cadre dans la fenêtre
 * @param {string} gauche La position en abscisses du cadre dans la fenêtre
 * @param {string} couleur La couleur du quadrillage
 * Attention : Un quadrillage n'a pas d'id et il ne peut y en avoir qu'un dans une figure.
 */
function Quadrillage (doc, type, hauteur, largeur, haut, gauche, couleur) {
  ObjetBase.call(this, doc, 'quadrillageIEP', couleur) // Le repère aura pour Id quadrillageIEP
  this.hauteur = parseFloat(hauteur)
  this.largeur = parseFloat(largeur)
  this.haut = (haut == null) ? 0 : parseFloat(haut)
  this.gauche = (gauche == null) ? 0 : parseFloat(gauche)
  this.type = type
  this.cadre = {}
  this.cadre.gauche = this.gauche * 30 // 30 px pour 1 cm
  this.cadre.haut = this.haut * 30
  this.cadre.droite = this.cadre.gauche + this.largeur * 30
  this.cadre.bas = this.cadre.haut + this.hauteur * 30
  this.objet = 'quadrillage'
}

Quadrillage.prototype = new ObjetBase()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Quadrillage.prototype.creeg = function () {
  const gauche = this.cadre.gauche
  const droite = this.cadre.droite
  const haut = this.cadre.haut
  const bas = this.cadre.bas
  const couleur = this.couleur
  this.g = document.createElementNS(svgns, 'g')
  // Un seul quadrillage sur une figure.
  const oldg = this.doc.svg.getElementById('quadrillageIEP')
  if (oldg != null) this.doc.svg.removeChild(oldg)
  switch (this.type) {
    case 'seyes':
      this.tracer_grille(couleur, 24, 6, gauche, haut, droite, bas, false, 1) // 1 est l'opacité
      this.tracer_grille(couleur, 24, 24, gauche, haut, droite, bas, false, 1)
      break
    case 'millimetre':
      this.tracer_grille(couleur, 3, 3, gauche, haut, droite, bas, false, 0.6)
      this.tracer_grille(couleur, 30, 30, gauche, haut, droite, bas, false, 0.8)
      this.tracer_grille(couleur, 150, 150, gauche, haut, droite, bas, false, 1)
      break
    case '10x10':
    case '10x':
      this.tracer_grille(couleur, 30, 30, gauche, haut, droite, bas, false, 1)
      break
    case '5x5':
    case '5x':
    default:
      this.tracer_grille(couleur, 15, 15, gauche, haut, droite, bas, false, 1)
      break
  }
}
/**
 * Fonction reprise à partir du code de la version Flash
 * @param {string} epaisseur
 * @param {string} couleur
 * @param {number} ecart_x
 * @param {number} ecart_y
 * @param {number} debut_x
 * @param {number} debut_y
 * @param {number} fin_x
 * @param {number} fin_y
 * @param {number} pointille
 * @param {number} alpha
 */
Quadrillage.prototype.tracer_grille = function (couleur, ecart_x, ecart_y, debut_x, debut_y, fin_x, fin_y, pointille, alpha) {
  let li, i
  const style = 'stroke:' + couleur + ';stroke-width:0.5;' + 'stroke-opacity:' + alpha + ';'
  if (pointille) this.style += 'stroke-dasharray:2 2;' // Pointillés
  let nb = Math.ceil(Math.abs(fin_x - debut_x) / ecart_x)
  for (i = 0; i < nb; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', debut_x + i * ecart_x)
    li.setAttribute('y1', debut_y)
    li.setAttribute('x2', debut_x + i * ecart_x)
    li.setAttribute('y2', fin_y)
    li.setAttribute('style', style)
    this.g.appendChild(li)
  }
  nb = Math.ceil(Math.abs(fin_y - debut_y) / ecart_y)
  for (i = 0; i < nb; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', debut_x)
    li.setAttribute('y1', debut_y + i * ecart_y)
    li.setAttribute('x2', fin_x)
    li.setAttribute('y2', debut_y + i * ecart_y)
    li.setAttribute('style', style)
    this.g.appendChild(li)
  }
}
