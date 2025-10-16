/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMarqueAngleOriente from '../objets/CMarqueAngleOriente'
import { chaineNombre, cos30, getStr, sin30 } from '../kernel/kernel'
import Vect from '../types/Vect'
import StyleFleche from '../types/StyleFleche'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
export default CMarqueAngleOriente

CMarqueAngleOriente.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo67') + ' ' + getStr('of') + ' ' +
    this.a.getName() + this.o.getName() + this.b.getName()
}

CMarqueAngleOriente.prototype.estOriente = function () {
  return true
}

/**
 * Doone à l'arc le style de flèche styleFleche
 * @param {StyleFleche} styleFleche
 * @returns {void}
 */
CMarqueAngleOriente.prototype.donneStyleFleche = function (styleFleche) {
  this.motifFleche = styleFleche
}

CMarqueAngleOriente.prototype.tikzFleche = function (dimf, xa, ya, u, coefmult, bu) {
  const abscisses = new Array(3)
  const ordonnees = new Array(3)
  const u1 = new Vect()
  const u2 = new Vect()
  const list = this.listeProprietaire
  const longueurFleche = StyleFleche.longeurFlechePourArc(this.motifFleche, list)

  u.vecteurColineaire(longueurFleche, u1)
  // On fait tourner le vecteur u1 de -pi/6 pour avoir u2
  u2.x = u1.x * cos30 - u1.y * sin30
  u2.y = u1.x * sin30 + u1.y * cos30
  abscisses[1] = xa
  ordonnees[1] = ya
  abscisses[0] = xa + u2.x
  ordonnees[0] = Math.round(ya + u2.y)
  // On fait tourner le vecteur u1 de pi/6 pour avoir u2
  u2.x = u1.x * cos30 + u1.y * sin30
  u2.y = -u1.x * sin30 + u1.y * cos30
  abscisses[2] = xa + u2.x
  ordonnees[2] = ya + u2.y
  switch (this.motifFleche) {
    case StyleFleche.FlecheLonguePleine:
    case StyleFleche.FlecheCourtePleine:
      // Il faut tracer le polygone car fillPolygon ne trace que l'intérieur'
      return '\\filldraw ' + this.tikzdrawFillStyle(dimf, coefmult) + '(' +
        chaineNombre(list.tikzXcoord(abscisses[0], dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(ordonnees[0], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[1], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[1], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[2], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[2], dimf, bu), 3) + ')--cycle;'
    case StyleFleche.FlecheLongueSimple:
    case StyleFleche.FlecheCourteSimple:
      return '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' +
        chaineNombre(list.tikzXcoord(abscisses[0], dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(ordonnees[0], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[1], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[1], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[2], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[2], dimf, bu), 3) + ');'
    default : return ''
  }
}

CMarqueAngleOriente.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  return CMarqueAngleGeometrique.prototype.tikz.call(this, dimf, nomaff, coefmult, bu) + '\n' +
    this.tikzFleche(dimf, this.xdeb, this.ydeb, this.vecteurDirection, coefmult, bu)
}
