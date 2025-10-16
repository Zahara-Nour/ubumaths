/*
 * Created by yvesb on 12/01/2017.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroite from '../objets/CDemiDroite'
import { colineairesMemeSens, distancePointPoint, getStr, zero } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CDemiDroite

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CDemiDroite.prototype.getTypeName = function () {
  return getStr('Ddte')
}

CDemiDroite.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else {
    const pointr = { x: 0, y: 0 }
    projetteOrtho(xp, yp, this.point_x, this.point_y, this.vect, pointr)
    if (this.appartientA(pointr.x, pointr.y)) {
      return distancePointPoint(xp, yp, pointr.x, pointr.y)
    } else return -1
  }
}
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CDemiDroite.prototype.genereNom = function () {
  CDemiDroite.ind++
  return getStr('rdd') + CDemiDroite.ind
}
CDemiDroite.prototype.coincideAvec = function (p) {
  if (p.getNature() !== NatObj.NDemiDroite) return false
  return zero(this.point_x - p.point_x) && colineairesMemeSens(this.vect, p.vect)
}
/**
 * Fonction  servant à savoir si un point
 * est par définition sur une droite, demi-droite ou segment. Renverra true par exemple
 * si la droite est définie par deux points et le point est un de ces deux points
 * ou si le point est lié à la droite
 * A redéfinir pour les descendants
 * @param {CPt} po
 * @returns {boolean}
 **/
CDemiDroite.prototype.contientParDefinition = function (po) {
  return false
}
