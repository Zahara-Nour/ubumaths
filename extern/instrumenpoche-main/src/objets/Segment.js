/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { cos30, sin30, svgns } from '../global/constantes'
import DroiteAncetre from '../objets/DroiteAncetre'
import Vect from '../types/Vect'
export default Segment

/**
 * Classe représentant un segment qui peut être affublé d'une flèche
 * @extends ObjetBase
 * @constructor
 * @param {number} x1 Abscisse de l'origine
 * @param {integre} y1 Ordonnée de l'origine
 * @param {number} x2 Abscisse de l'extrémité
 * @param {interger} y2 Ordonnée de l'extrémité
 * @param {string} couleur couleur
 * @param {number} epaisseur épaiseur du trait
 * @param {string} opacite transparence du trait (de 0 à 100)
 * @param {string} styleTrait Si "tiret" pointillés sinon trait continu
 * @param {boolean} vecteur Si true on rajoute une flcèce
 */
function Segment (doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait, stylefleche) {
  DroiteAncetre.call(this, doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait)
  this.stylefleche = stylefleche
}

Segment.prototype = new DroiteAncetre()

/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 * Si le segment est en fait un vecteur on crée d'abord le svg élément du segment
 * et on lui rajoute une flèche
 */
Segment.prototype.creeg = function () {
  DroiteAncetre.prototype.creeg.call(this)
  if (this.stylefleche === 'vecteur') {
    const longFleche = 12
    const x1 = this.x1
    const x2 = this.x2
    const y1 = this.y1
    const y2 = this.y2
    const u0 = new Vect(x2, y2, x1, y1)
    const u1 = u0.vecteurColineaire(longFleche)
    const u2 = new Vect(u1.x * cos30 - u1.y * sin30,
      u1.x * sin30 + u1.y * cos30)
    const u3 = new Vect(u1.x * cos30 + u1.y * sin30,
      -u1.x * sin30 + u1.y * cos30)
    const points = String(x2 + u2.x) + ' ' + String(y2 + u2.y) +
      ',' + x2 + ' ' + y2 + ',' + String(x2 + u3.x) + ' ' + String(y2 + u3.y)
    const g = document.createElementNS(svgns, 'polyline')
    g.setAttribute('points', points)
    const style = 'stroke:' + this.couleur + ';stroke-width:' + this.epaisseur +
          ';stroke-opacity:' + this.opacite + ';fill:none'
    g.setAttribute('style', style)
    this.g.appendChild(g)
  }
}
