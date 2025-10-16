/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import {zero} from '../kernel/kernel' Ne fontionne pas (pb de dépendance cyclique)
// Déplacé dans presqueNull
import { zero } from '../kernel/kernel'

export default Vect
/**
 * Classe représentant un vecteur de façon interne.
 * Classe nommée VecteurDirecteur dans la version Java
 * @constructor
 */
function Vect () {
  // Si quatre arguments pour le constructeur, ce sont les coordonnées de l'origine et de l'extrémité'
  if (arguments.length === 0) {
    this.x = 0
    this.y = 0
  } else {
    if (arguments.length === 4) {
      this.x = arguments[2] - arguments[0]
      this.y = arguments[3] - arguments[1]
    } else { // Sinon constructeur à partir de deux points
      this.x = arguments[1].x - arguments[0].x
      this.y = arguments[1].y - arguments[0].y
    }
  }
}
/**
 * Fonction faisant de vect une copie de this.
 * vect doit être un objet Vect
 * @param {Vect} vect
 * @returns {void}
 */
Vect.prototype.setCopy = function (vect) {
  vect.x = this.x
  vect.y = this.y
}
/**
 * Fonction faisant de this un Vect d'origine x1 et d'extrémité x2
 * si le nombre d'arguement est 2 et (x1,y1) et (x2,y2) si le nombre d'argumetns est4.
 * @param {number|CPt} x1
 * @param {number|CPt} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {void}
 */
Vect.prototype.setVecteur = function (x1, y1, x2, y2) {
  if (arguments.length === 2) {
    this.x = y1.x - x1.x
    this.y = y1.y - x1.y
  } else {
    this.x = x2 - x1
    this.y = y2 - y1
  }
}
/**
 * Renvoie la norme du vecteur.
 * @returns {number}
 */
Vect.prototype.norme = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y)
}
/**
 * Rebvoie true si les deux coordonnées du vecteur sont nulles.
 * @returns {boolean}
 */
Vect.prototype.nul = function () {
  return (this.x === 0) && (this.y === 0)
}
/**
 * Renvoie true si le vecteur est "presque" nul.
 * @returns {boolean}
 */
Vect.prototype.presqueNul = function () {
  return zero(this.x) && zero(this.y)
}
/**
 * Fait de vect un vecteur orthogonal à this et de même norme.
 * @param {Vect} vect
 * @returns {void}
 */
Vect.prototype.getOrthogonal = function (vect) {
  vect.y = this.x
  vect.x = -this.y
}
// Fait du Vect v un Vect de norme norme, colinéaire à v et de même sens
/**
 * Fait du Vect v un Vect de norme normeSouhaitee, colinéaire à v et de même sens
 * @param {number} normeSouhaitee  nombre positif strictement.
 * @param {Vect} v
 * @returns {void}
 */
Vect.prototype.vecteurColineaire = function (normeSouhaitee, v) {
  const norm = this.norme()
  v.x = this.x / norm * normeSouhaitee
  v.y = this.y / norm * normeSouhaitee
}
/**
 * Renvoie la mesure en radians de l'angle polaire du vecteur this non null
 * Renvoie 0 si le vecteur est nul.
 * @returns {number}
 */
Vect.prototype.angleRad = function () {
  let angle
  if ((this.x === 0) && (this.y === 0)) return 0
  else {
    if (this.x === 0) {
      if (this.y > 0) { angle = 3 * Math.PI / 2 } else angle = Math.PI / 2
    } else {
      if (this.x >= 0) { angle = Math.atan(-this.y / this.x) } else angle = Math.PI - Math.atan(this.y / this.x)
      if (angle < 0) angle = angle + 2 * Math.PI
    }
  }
  return angle
}
/**
 * Fonction renvoyant la mesure en radians de l'angle orienté
 * formé par les vecteurs u et v, cette mesure étant valable
 * dans le repère observateur,  et étant l'opposée de celle
 * valable dans le système de coordonnées utilisé par Windows
 * @param {Vect} v
 * @returns {number}
 */
Vect.prototype.mesureAngleVecteurs = function (v) {
  let resul
  const prosca = v.x * this.x + v.y * this.y
  const deter = v.x * this.y - v.y * this.x
  if (prosca === 0) {
    if (deter > 0) resul = Math.PI / 2
    else resul = -Math.PI / 2
  } else {
    const tangente = deter / prosca
    if (prosca > 0) resul = Math.atan(tangente)
    else {
      if (deter >= 0) resul = Math.atan(tangente) + Math.PI
      else resul = Math.atan(tangente) - Math.PI
    }
  }
  return resul
}
/**
 * Fonction faisant de v un vecteur image de this par la rotation
 * d'angle angle (donné en radian).
 * @param {number} angle
 * @param {Vect} v
 * @returns {void}
 */
Vect.prototype.tourne = function (angle, v) {
  const kc = Math.cos(angle)
  const ks = Math.sin(angle)
  v.x = kc * this.x + ks * this.y
  v.y = kc * this.y - ks * this.x
}
