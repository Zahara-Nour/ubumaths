/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import Vect from './Vect'
import { cos30, sin30 } from '../kernel/kernel'

const FlecheLonguePleine = 0
const FlecheCourtePleine = 1
const FlecheLongueSimple = 2
const FlecheCourteSimple = 3

/**
 * Sert à définir les styles de flèches utilisés pour les vecteurs et marques d'angle orientées.
 * @typedef StyleFleche
 * @type {Object}
 */
const StyleFleche = {
  FlecheLonguePleine,
  FlecheCourtePleine,
  FlecheLongueSimple,
  FlecheCourteSimple,

  // Modifié version 5.0 pour tenir compte des figures de haute définition et dans ce cas agrandir les flèches
  longueurFlechePourVecteur: function (motif, liste) {
    const coefMult = liste.coefMult ? liste.coefMult : 1
    switch (motif) {
      case FlecheLonguePleine:
      case FlecheLongueSimple:
        return 8 * coefMult
      case FlecheCourtePleine:
      case FlecheCourteSimple:
        return 6 * coefMult
      default : return 6 * coefMult
    }
  },
  // Modifié version 5.0 pour tenir compte des figures de haute définition et dans ce cas agrandir les flèches
  longeurFlechePourArc: function (motif, liste) {
    const coefMult = liste.coefMult ? liste.coefMult : 1
    switch (motif) {
      case FlecheLonguePleine:
      case FlecheLongueSimple:
        return 8 * coefMult
      case FlecheCourtePleine:
      case FlecheCourteSimple:
        return 5 * coefMult
      default : return 5 * coefMult
    }
  },
  // Spécifique version JavaScript
  creeFleche: function (xa, ya, xb, yb, motifFleche, liste, couleur, style) {
    let g
    const u0 = new Vect()
    const u1 = new Vect()
    const u2 = new Vect()
    const u3 = new Vect()
    const longueurFleche = StyleFleche.longueurFlechePourVecteur(motifFleche, liste)

    u0.setVecteur(xb, yb, xa, ya)
    u0.vecteurColineaire(longueurFleche, u1)
    // On fait tourner le Vect u1 de -pi/6 pour avoir u2
    u2.x = u1.x * cos30 - u1.y * sin30
    u2.y = u1.x * sin30 + u1.y * cos30
    u3.x = u1.x * cos30 + u1.y * sin30
    u3.y = -u1.x * sin30 + u1.y * cos30
    const points = (xb + u2.x).toString() + ' ' + (yb + u2.y).toString() +
      ',' + xb + ' ' + yb + ',' + (xb + u3.x).toString() + ' ' + (yb + u3.y).toString()
    switch (motifFleche) {
      case FlecheLonguePleine:
      case StyleFleche.FlecheCourtePleine:
        g = cens('polygon', {
          style: style + 'fill:' + couleur
        })
        break
      case StyleFleche.FlecheLongueSimple:
      case StyleFleche.FlecheCourteSimple:
        g = cens('polyline', {
          style: style + 'fill:none'
        })
    }
    g.setAttribute('points', points)
    return g
  },
  // Procédure dessinant la flèche en bout d'une marque d'angle orienté
  // Le Vect u désigne la direction opposée à celle de la flèche
  // et (xa, ya) le point extrémité de la flèche
  creeFlechePourArc: function (color, xa, ya, u, motifFleche, liste) {
    const path = cens('path')
    let style = ''
    const stroke = this.style.stroke
    if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
    const strokewidth = this.style.strokeWidth
    style += 'stroke-width:' + strokewidth + ';'
    // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
    style += 'stroke:' + this.color + ';'
    const u1 = new Vect()
    const u2 = new Vect()
    const longueurFleche = StyleFleche.longeurFlechePourArc(motifFleche, liste)
    u.vecteurColineaire(longueurFleche, u1)
    u2.x = u1.x * cos30 - u1.y * sin30
    u2.y = u1.x * sin30 + u1.y * cos30
    const abs0 = xa + u2.x
    const ord0 = ya + u2.y
    // On fait tourner le Vect u1 de pi/6 pour avoir u2
    u2.x = u1.x * cos30 + u1.y * sin30
    u2.y = -u1.x * sin30 + u1.y * cos30
    const abs2 = xa + u2.x
    const ord2 = ya + u2.y
    switch (motifFleche) {
      case FlecheLonguePleine:
      case FlecheCourtePleine:
        style += 'fill:' + color.rgb() + ';'
        path.setAttribute('path', 'M' + abs2 + ' ' + ord2 + 'L' + xa + ' ' + ya + 'L' + abs0 + ' ' + ord0 + 'Z')
        break
      case FlecheLongueSimple:
      case FlecheCourteSimple:
        style += 'fill:none;'
        path.setAttribute('path', 'M' + abs2 + ' ' + ord2 + 'L' + xa + ' ' + ya + 'L' + abs0 + ' ' + ord0)
    }
    path.setAttribute('style', style)
    return path
  }
}
export default StyleFleche
