/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */

import { zero } from '../global'
import { convDegRad, convRadDeg } from '../global/constantes'
export default Vect

/**
 * Classe vecteur
 * Peut être initialisé par les coordonnées de l'origine et de l'extrémité ou
 * par deux coordonnées
 * @constructor
 * @param {number} x1 Abscisse de l'origine ou première coordonnée si deux paramètres
 * @param {number} y1 Ordonnée de l'origine ou première coordonnée si deux paramètres
 * @param {number} x2 Abscisse de l'extrémité si quatre paramètres
 * @param {number} y2 Ordonnée de l'extrémité si quatre paramètres
 */
function Vect (x1, y1, x2, y2) {
  if (arguments.length > 2) {
    this.x = x2 - x1
    this.y = y2 - y1
  } else {
    this.x = x1
    this.y = y1
  }
}
/**
 * Retourne true si la norme du vecteur est inférieur oue égale à 10^-9
 * @returns {boolean}
 */
Vect.prototype.presqueNul = function () {
  return zero(this.x) && zero(this.y)
}
/**
 * Retourne la norme du vecteur
 * @returns {number}
 */
Vect.prototype.norme = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y)
}
/**
 * Renvoie un vecteur de norme norme, colinéaire à v et de même sens
 * @param {number} normeSouhaitee  la norme du vecteur renvoyé
 * @returns {Vect}
 */
Vect.prototype.vecteurColineaire = function (normeSouhaitee) {
  const norm = this.norme()
  return new Vect(this.x / norm * normeSouhaitee, this.y / norm * normeSouhaitee)
}
/**
 * Fonction faisiant tourner un vecteur de l'angle ang et renvoyant un nouveua vecteur
 * correspondant à cette transformation
 * @param {number} angle L'ange de rotation en degrés
 */
Vect.prototype.tourne = function (angle) {
  const kc = Math.cos(angle * convDegRad)
  const ks = Math.sin(angle * convDegRad)
  return new Vect(kc * this.x - ks * this.y, kc * this.y + ks * this.x)
}
/**
 * Renvoie la mesure en degrés de l'angle polaire d'un vecteur non nul
 * Le nombre renvoyé est entre 0 et 380 (exclu)
 * @returns {number}
 */
Vect.prototype.angle = function () {
  let angle
  if ((this.x === 0) && (this.y === 0)) return 0
  else {
    if (this.x === 0) {
      if (this.y > 0) { angle = 3 * Math.PI / 2 } else angle = Math.PI / 2
    } else {
      if (this.x >= 0) { angle = Math.atan(-this.y / this.x) } else {
        angle = Math.PI - Math.atan(this.y / this.x)
      }
      if (angle < 0) angle = angle + 2 * Math.PI
    }
  }
  return angle * convRadDeg
}
