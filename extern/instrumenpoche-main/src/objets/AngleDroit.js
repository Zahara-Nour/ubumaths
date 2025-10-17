/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import Vect from '../types/Vect'
export default AngleDroit
/**
 * Classe représentant une marque d'angle droit de la figure
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propiétaire de la figure
 * @param {string} id id de l'objet dans le xml de la figure
 * @param {number} xsommet absisse du sommet de l'angle droit
 * @param {number} ysommet ordonnée du sommet de l'angle droit
 * @param {number} xinter abscisse du sommet de la marque d'angle
 * @param {number} yinter ordonnée du sommet de la marque d'angle
 * @param {SvgColor} couleur couleur de la marque
 * @param {number} epaisseur
 */
function AngleDroit (doc, id, xsommet, ysommet, xinter, yinter, couleur, epaisseur) {
  this.xsommet = parseFloat(xsommet)
  this.ysommet = parseFloat(ysommet)
  this.xinter = parseFloat(xinter)
  this.yinter = parseFloat(yinter)
  Ligne.call(this, doc, id, couleur, epaisseur, 100)
  this.objet = 'angle_droit'
}
AngleDroit.prototype = new Ligne()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
AngleDroit.prototype.creeg = function () {
  let v1 = new Vect(this.xsommet, this.ysommet, this.xinter, this.yinter)
  const n = v1.norme()
  v1 = v1.vecteurColineaire(n / Math.sqrt(2))
  v1 = v1.tourne(45)
  const v2 = v1.tourne(-90)
  const p = document.createElementNS(svgns, 'polyline')
  const points = String(this.xsommet + v1.x) + ' ' + String(this.ysommet + v1.y) + ' ' +
    this.xsommet + ' ' + this.ysommet + ' ' + String(this.xsommet + v2.x) + ' ' + String(this.ysommet + v2.y)
  p.setAttribute('points', points)
  p.setAttribute('style', this.style + 'fill:none;')
  this.g = p
}
