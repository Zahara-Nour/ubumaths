/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import * as kernel from '../global'
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
export default Repere
/**
 * Classe représentant un repère de la figure
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le docmument propriétaire
 * @param {string} hauteur Hauteur du cadre contenant le repère, exprimées en centimètres
 * @param {string} largeur Largeur du cadre contenant le repère, exprimées en centimètres
 * @param {string} haut abscisse de ce cadre relativement au bord haut et au
 * bord gauche de la zone de dessin, en centimètres
 * @param {string} gauche Ordonnée de ce cadre relativement au bord haut et
 * au bord gauche de la zone de dessin, en centimètres
 * @param {string} xgrad donne les unités de graduations : si Xgrad est égal à 5,
 *  le repère va être gradué de 5 en 5
 * @param {string} ygrad donne les unités de graduations : si Ygrad est égal à 5, le repère va être gradué de 5 en 5
 * @param {string} xmin valeur mini des abscisses dans le repère
 * @param {string} xmax valeur maxi des abscisses dans le repère
 * @param {string} ymin valeur mini des ordonnées dans le repère
 * @param {string} ymax valeur maxi des ordonnées dans le repère
 * @param {SvgColor} couleur Couleur du tracé
 * @param {string} grille "invisible” si on souhaite que le quadrillage soit masqué
 * @param {string} axes “invisible” si on souhaite que les axes soient masqué
 * @param {string} etiquettes “invisible” si on souhaite que les étiquettes des axes soient masquées
 */
function Repere (doc, hauteur, largeur, haut, gauche, xgrad, ygrad, xmin, xmax,
  ymin, ymax, couleur, grille, axes, etiquettes) {
  ObjetBase.call(this, doc, 'repereIEP', couleur) // Le repère aura pour Id repereIEP
  this.hauteur = hauteur
  this.largeur = largeur
  this.haut = (haut == null) ? 0 : parseFloat(haut)
  this.gauche = (gauche == null) ? 0 : parseFloat(gauche)
  this.xgrad = parseFloat(xgrad)
  this.ygrad = parseFloat(ygrad)
  this.xmin = parseFloat(xmin)
  this.xmax = parseFloat(xmax)
  this.ymin = parseFloat(ymin)
  this.ymax = parseFloat(ymax)
  this.grille = (grille == null) ? 'visible' : grille
  this.axes = (axes == null) ? 'visible' : axes
  this.etiquettes = (etiquettes == null) ? 'visible' : etiquettes
  this.cadre = {}
  this.cadre.gauche = this.gauche * 30 // 30 px pour 1 cm
  this.cadre.haut = this.haut * 30
  this.cadre.droite = this.cadre.gauche + this.largeur * 30
  this.cadre.bas = this.cadre.haut + this.hauteur * 30
}
Repere.prototype = new ObjetBase()
/**
 *
 * @param {number} nbr
 * @returns {number}
 */
Repere.prototype.mettre_x_en_pixels = function (nbr) {
  return kernel.mettre_en_pixels(nbr, this.xmin, this.xmax, this.cadre.gauche, this.cadre.droite)
}
/**
 * Fonction utilisée dans l'objet repere. Repris du code Flash
 */
Repere.prototype.mettre_y_en_pixels = function (nbr) {
  return kernel.mettre_en_pixels(nbr, this.ymax, this.ymin, this.cadre.haut, this.cadre.bas)
}
/**
 *
 * @param {number} debut_trace_x
 * @param {number} unite_x
 * @param {number} nb_grad_x
 * @param {number} ordo_etiquettes
 * @param {number} haut
 * @param {number} bas
 */
Repere.prototype.tracer_abscisses = function (debut_trace_x, unite_x, nb_grad_x, ordo_etiquettes, haut, bas) {
  let li, txt, abscisse, i
  const tailleEtiquettes = 12 // Taille de la police utilisée pour les étiquettes
  const style = 'stroke:black;stroke-width:0.5;'

  if (this.grille === 'invisible' && this.axes !== 'invisible') {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', this.cadre.gauche)
    li.setAttribute('y1', ordo_etiquettes)
    li.setAttribute('x2', this.cadre.droite)
    li.setAttribute('y2', ordo_etiquettes)
    this.g.appendChild(li)
  }
  for (i = 0; i <= nb_grad_x; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    abscisse = this.mettre_x_en_pixels(debut_trace_x + i * unite_x)
    if (this.grille === 'invisible') {
      if (this.axes !== 'invisible') {
        li.setAttribute('x1', abscisse)
        li.setAttribute('y1', String(ordo_etiquettes - 5))
        li.setAttribute('x2', abscisse)
        li.setAttribute('y2', String(ordo_etiquettes + 5))
        this.g.appendChild(li)
      }
    } else {
      li.setAttribute('x1', abscisse)
      li.setAttribute('y1', haut)
      li.setAttribute('x2', abscisse)
      li.setAttribute('y2', bas)
      this.g.appendChild(li)
    }
    if (this.etiquettes !== 'invisible' && this.axes !== 'invisible') {
      txt = document.createElementNS(svgns, 'text')
      txt.setAttribute('x', abscisse + 2)
      txt.setAttribute('y', ordo_etiquettes + tailleEtiquettes)
      const stylet = 'text-anchor:left;font-size:' + tailleEtiquettes + 'px;' + 'fill:' + this.couleur + ';'
      txt.setAttribute('style', stylet)
      txt.appendChild(document.createTextNode(String(debut_trace_x + i * unite_x)))
      this.g.appendChild(txt)
    }
  }
}
/**
 *
 * @param {number} debut_trace_y
 * @param {number} unite_y
 * @param {number} nb_grad_y
 * @param {number} abs_etiquettes
 * @param {number} gauche
 * @param {number} droite
 */
Repere.prototype.tracer_ordonnees = function (debut_trace_y, unite_y, nb_grad_y, abs_etiquettes, gauche, droite) {
  let li, txt, ordonnee, i
  const tailleEtiquettes = 12 // Taille de la police utilisée pour les étiquettes
  const style = 'stroke:black;stroke-width:0.5;'
  if (this.grille === 'invisible' && this.axes !== 'invisible') {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', abs_etiquettes)
    li.setAttribute('y1', this.cadre.haut)
    li.setAttribute('x2', abs_etiquettes)
    li.setAttribute('y2', this.cadre.bas)
    this.g.appendChild(li)
  }
  for (i = 0; i <= nb_grad_y; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    ordonnee = this.mettre_y_en_pixels(debut_trace_y + i * unite_y)
    if (this.grille === 'invisible') {
      if (this.axes !== 'invisible') {
        li.setAttribute('x1', String(abs_etiquettes - 5))
        li.setAttribute('y1', ordonnee)
        li.setAttribute('x2', String(abs_etiquettes + 5))
        li.setAttribute('y2', ordonnee)
        this.g.appendChild(li)
      }
    } else {
      li.setAttribute('x1', gauche)
      li.setAttribute('y1', ordonnee)
      li.setAttribute('x2', droite)
      li.setAttribute('y2', ordonnee)
      this.g.appendChild(li)
    }
    if (this.etiquettes !== 'invisible' && this.axes !== 'invisible') {
      txt = document.createElementNS(svgns, 'text')
      txt.setAttribute('x', abs_etiquettes + 2)
      txt.setAttribute('y', ordonnee + tailleEtiquettes)
      const stylet = 'text-anchor:left;font-size:' + tailleEtiquettes + 'px;' + 'fill:' + this.couleur + ';'
      txt.setAttribute('style', stylet)
      txt.appendChild(document.createTextNode(String(debut_trace_y + i * unite_y)))
      this.g.appendChild(txt)
    }
  }
}
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Repere.prototype.creeg = function () {
  const width = this.cadre.droite - this.cadre.gauche
  const height = this.cadre.bas - this.cadre.haut
  this.g = document.createElementNS(svgns, 'g')
  const defs = document.createElementNS(svgns, 'defs')
  const clip = document.createElementNS(svgns, 'clipPath')
  clip.setAttribute('id', 'clipRepere')
  const style = 'stroke:' + this.couleur + ';stroke-width:1;fill:none;'
  const rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('style', style)
  rect.setAttribute('x', this.cadre.gauche)
  rect.setAttribute('y', this.cadre.haut)
  rect.setAttribute('width', width)
  rect.setAttribute('height', height)
  clip.appendChild(rect)
  defs.appendChild(clip)
  this.g.appendChild(defs)
  this.g.setAttribute('style', 'clip-path:url(#clipRepere)')

  // Si besoin, on trace des graduations pour les abscisses
  if ((this.xmax - this.xmin) > this.xgrad) {
    // nombre de graduations qui appraitront
    const nb_grad_x = Math.floor((this.xmax - this.xmin) / this.xgrad)
    /*
     determination de l'ordonnée des étiquettes pour les abscisses
     */
    let ordo_etiquettes
    if (this.ymax * this.ymin < 0) {
      ordo_etiquettes = this.mettre_y_en_pixels(0)
    } else if (this.ymax < 0) {
      ordo_etiquettes = this.cadre.haut
    } else {
      ordo_etiquettes = this.cadre.bas
    }
    /*
     FIN ETIQUETTES
     */

    /*
     DETERMINATION ABSCISSES
     */
    const debut_trace_x = kernel.determiner_graduations(this.xmin, this.xmax, this.xgrad)
    this.tracer_abscisses(debut_trace_x, this.xgrad, nb_grad_x, ordo_etiquettes, this.cadre.haut, this.cadre.bas)
    /*
     FIN ABSCISSES
     */
  }
  if ((this.ymax - this.ymin) > this.ygrad) {
    const nb_grad_y = Math.floor((this.ymax - this.ymin) / this.ygrad)
    /*
     determination de l'abscisse des étiquettes pour les ordonnées
     */
    let abs_etiquettes
    if (this.xmax * this.xmin < 0) {
      abs_etiquettes = this.mettre_x_en_pixels(0)
    } else if (this.xmax < 0) {
      abs_etiquettes = this.cadre.droite
    } else {
      abs_etiquettes = this.cadre.gauche
    }
    const debut_trace_y = kernel.determiner_graduations(this.ymin, this.ymax, this.ygrad)
    this.tracer_ordonnees(debut_trace_y, this.ygrad, nb_grad_y, abs_etiquettes, this.cadre.gauche, this.cadre.droite)
  }
  // tracer_les_fonctions();
  const rect2 = document.createElementNS(svgns, 'rect')
  rect2.setAttribute('style', style)
  rect2.setAttribute('x', this.cadre.gauche)
  rect2.setAttribute('y', this.cadre.haut)
  rect2.setAttribute('width', width)
  rect2.setAttribute('height', height)
  this.g.appendChild(rect2)
  this.g.setAttribute('visibility', 'hidden')
}
