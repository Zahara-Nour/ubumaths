/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CVecteur from '../objets/CVecteur'
import CSegment from '../objets/CSegment'
import { chaineNombre, cos30, getStr, sin30 } from '../kernel/kernel'
import Vect from '../types/Vect'
import StyleFleche from '../types/StyleFleche'
export default CVecteur

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CVecteur.prototype.getTypeName = function () {
  return getStr('Vect')
}

CVecteur.prototype.donneStyleFleche = function (motifFleche) {
  this.motifFleche = motifFleche
}

CVecteur.prototype.infoHist = function () {
  return getStr('Vect') + ' ' + this.point1.getName() + this.point2.getName()
}

/**
 * Fonction utilisée par le protocole de la figure et renvoyant soit le nom de la droite (donnée lors de la boîte
 * de dialogue de protocole soit la chaîne de caractères décriavnt la doite ((OA) par exemple).
 * @returns {string}
 */
CVecteur.prototype.getNom = function () {
  return this.infoHist()
}

CVecteur.prototype.tikzFleche = function (dimf, coefmult, bu) {
  const abscisses = new Array(3)
  const ordonnees = new Array(3)
  const u0 = new Vect()
  const u1 = new Vect()
  const u2 = new Vect()
  const x1 = this.x1
  const y1 = this.y1
  const y2 = this.y2
  const x2 = this.x2
  const list = this.listeProprietaire
  const longueurFleche = StyleFleche.longueurFlechePourVecteur(this.motifFleche, list)

  u0.setVecteur(x2, y2, x1, y1)
  u0.vecteurColineaire(longueurFleche, u1)
  // On fait tourner le vecteur u1 de -pi/6 pour avoir u2
  u2.x = u1.x * cos30 - u1.y * sin30
  u2.y = u1.x * sin30 + u1.y * cos30
  abscisses[1] = x2
  ordonnees[1] = y2
  abscisses[0] = x2 + u2.x
  ordonnees[0] = y2 + u2.y
  // On fait tourner le vecteur u1 de pi/6 pour avoir u2
  u2.x = u1.x * cos30 + u1.y * sin30
  u2.y = -u1.x * sin30 + u1.y * cos30
  abscisses[2] = x2 + u2.x
  ordonnees[2] = y2 + u2.y
  switch (this.motifFleche) {
    case StyleFleche.FlecheLonguePleine:
    case StyleFleche.FlecheCourtePleine:
      return '\\filldraw ' + this.tikzdrawFillStyle(dimf, coefmult) + '(' +
        chaineNombre(list.tikzXcoord(abscisses[0], dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(ordonnees[0], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[1], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[1], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[2], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[2], dimf, bu), 3) + ')--cycle;'
    case StyleFleche.FlecheLongueSimple:
    case StyleFleche.FlecheCourteSimple:
      return '\\draw ' + this.tikzLineStyleContinu(dimf, coefmult) + '(' +
        chaineNombre(list.tikzXcoord(abscisses[0], dimf, bu), 2) +
        ',' + chaineNombre(list.tikzYcoord(ordonnees[0], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[1], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[1], dimf, bu), 3) + ')--(' +
        chaineNombre(list.tikzXcoord(abscisses[2], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(ordonnees[2], dimf, bu), 3) + ');'
    default : return ''
  }
}

CVecteur.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  if (this.horsFenetre || this.vect.nul()) return ''
  let ch = CSegment.prototype.tikz.call(this, dimf, nomaff, coefmult, bu) // Code du segment
  // Puis on rajoute le code de la flèche
  if (!this.vect.presqueNul()) ch += '\n' + this.tikzFleche(dimf, coefmult, bu)
  return ch
}
