/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import * as kernel from '../global'
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
export default Axe
/**
 * Classe représentant un axe dans une figure InstrumenPoche
 * Repris à partir du code Flash
 * @extends ObjetBase
 * @constructor
 * @param {ie.iepDoc} doc le document propriétaire
 * @param {string} pente "horizontal" pour un axe horizontal, sinon vertical
 * @param {string} largeur
 * @param {string} haut
 * @param {string} gauche
 * @param {string} distanceBord
 * @param {string} xgrad
 * @param {string} xmin
 * @param {string} xmax
 * @param {string} couleur la couleur de l'axe
 */
function Axe (doc, pente, largeur, haut, gauche, distanceBord, xgrad, xmin, xmax, couleur) {
  ObjetBase.call(this, doc, 'axeIEP', couleur) // Le repère aura pour Id axeIEP
  this.pente = (pente == null) ? 'horizontal' : pente
  this.largeur = largeur
  this.haut = (haut == null) ? 0 : parseFloat(haut)
  this.gauche = (gauche == null) ? 0 : parseFloat(gauche)
  this.distanceBord = parseFloat(distanceBord)
  this.xgrad = xgrad
  this.xmin = xmin
  this.xmax = xmax
  this.cadre = {}
  this.cadre.gauche = this.gauche * 30 // 30 px pour 1 cm
  this.cadre.haut = this.haut * 30
  this.width = 30 * largeur
  this.cadre.droite = this.gauche + this.width
  this.cadre.bas = this.haut + this.width
}
Axe.prototype = new ObjetBase()

/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Axe.prototype.creeg = function () {
  let li, nb_grad_x, bord, debut_trace_x
  this.g = document.createElementNS(svgns, 'g')
  const style = 'stroke:black;stroke-width:1;'
  // Si besoin, on trace des graduations pour les abscisses
  if (this.pente === 'horizontal' && (this.xmax - this.xmin) > this.xgrad) {
    // nombre de graduations qui apparaitront
    nb_grad_x = Math.floor((this.xmax - this.xmin) / this.xgrad)
    /*
     determination de l'ordonnée de l'axe horizontal
     */
    bord = this.distanceBord * 30

    /*
     FIN ETIQUETTES
     */

    /*
     DETERMINATION ABSCISSES
     */
    debut_trace_x = kernel.determiner_graduations(this.xmin, this.xmax, this.xgrad)

    this.tracer_abscisses(debut_trace_x, this.xgrad, nb_grad_x, bord)
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', this.cadre.gauche)
    li.setAttribute('y1', bord)
    li.setAttribute('x2', this.cadre.droite)
    li.setAttribute('y2', bord)
    this.g.appendChild(li)
    /*
     FIN ABSCISSES
     */
  } else if ((this.xmax - this.xmin) > this.xgrad) {
    // nombre de graduations qui apparaitront
    nb_grad_x = Math.floor((this.xmax - this.xmin) / this.xgrad)
    /*
     determination de l'ordonnée de l'axe horizontal
     */
    bord = Number(this.distanceBord) * 30

    /*
     FIN ETIQUETTES
     */

    /*
     DETERMINATION ABSCISSES
     */
    debut_trace_x = kernel.determiner_graduations(this.xmin, this.xmax, this.xgrad)

    this.tracer_ordonnees(debut_trace_x, this.xgrad, nb_grad_x, bord)
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    li.setAttribute('x1', bord)
    li.setAttribute('y1', this.cadre.bas)
    li.setAttribute('x2', bord)
    li.setAttribute('y2', this.cadre.haut)
    this.g.appendChild(li)

    /*
     FIN ABSCISSES
     */
  }
}
/**
 * Fonction reprise du code Flash, utiilisée dans creeg()
 */
Axe.prototype.tracer_abscisses = function (debut_trace_x, unite_x, nb_grad_x, ordo_etiquettes) {
  let li, txt, abscisse, i
  const tailleEtiquettes = 12 // Taille de la police utilisée pour les étiquettes
  const style = 'stroke:black;stroke-width:1.5;'

  li = document.createElementNS(svgns, 'line')
  li.setAttribute('style', style)
  li.setAttribute('x1', this.cadre.gauche)
  li.setAttribute('y1', ordo_etiquettes)
  li.setAttribute('x2', this.cadre.droite)
  li.setAttribute('y2', ordo_etiquettes)
  this.g.appendChild(li)
  for (i = 0; i <= nb_grad_x; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    abscisse = this.mettre_x_en_pixels(debut_trace_x + i * unite_x)
    li.setAttribute('x1', abscisse)
    li.setAttribute('y1', String(ordo_etiquettes - 5))
    li.setAttribute('x2', abscisse)
    li.setAttribute('y2', String(ordo_etiquettes + 5))
    this.g.appendChild(li)
    txt = document.createElementNS(svgns, 'text')
    txt.setAttribute('x', abscisse)
    txt.setAttribute('y', ordo_etiquettes + tailleEtiquettes + 5)
    const stylet = 'text-anchor:left;font-size:' + tailleEtiquettes + 'px;' + 'fill:' + this.couleur + ';'
    txt.setAttribute('style', stylet)
    txt.appendChild(document.createTextNode(String(debut_trace_x + i * unite_x)))
    this.g.appendChild(txt)
  }
}
/**
 * Fonction reprise du code Flash, utiilisée dans creeg()
 */
Axe.prototype.tracer_ordonnees = function (debut_trace_y, unite_y, nb_grad_y, abs_etiquettes) {
  let li, txt, i
  const tailleEtiquettes = 12 // Taille de la police utilisée pour les étiquettes
  const style = 'stroke:black;stroke-width:1.5;'
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('style', style)
  li.setAttribute('x1', abs_etiquettes)
  li.setAttribute('y1', this.cadre.haut)
  li.setAttribute('x2', abs_etiquettes)
  li.setAttribute('y2', this.cadre.bas)
  this.g.appendChild(li)
  for (i = 0; i <= nb_grad_y; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('style', style)
    const ordonnee = this.mettre_y_en_pixels(debut_trace_y + i * unite_y)
    li.setAttribute('x1', String(abs_etiquettes - 5))
    li.setAttribute('y1', ordonnee)
    li.setAttribute('x2', String(abs_etiquettes + 5))
    li.setAttribute('y2', ordonnee)
    this.g.appendChild(li)
    txt = document.createElementNS(svgns, 'text')
    txt.setAttribute('x', abs_etiquettes + 10)
    txt.setAttribute('y', ordonnee + 2)
    const stylet = 'text-anchor:left;font-size:' + tailleEtiquettes + 'px;' + 'fill:' + this.couleur + ';'
    txt.setAttribute('style', stylet)
    txt.appendChild(document.createTextNode(String(debut_trace_y + i * unite_y)))
    this.g.appendChild(txt)
  }
}
/**
 * Fonction utilisée dans iep.axe
 * @param {number} nbr
 * @returns {number}
 */
Axe.prototype.mettre_x_en_pixels = function (nbr) {
  return kernel.mettre_en_pixels(nbr, this.xmin, this.xmax, this.cadre.gauche, this.cadre.droite)
}
/**
 * Fonction utilisée dans iep.axe
 * @param {number} nbr
 * @returns {number}
 */
Axe.prototype.mettre_y_en_pixels = function (nbr) {
  return kernel.mettre_en_pixels(nbr, this.xmax, this.xmin, this.cadre.haut, this.cadre.bas)
}
