/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default Rect
/**
 * Classe utilisée de façon interne pour représenter un rectangle.
 * @constructor
 * @param {number} x  L'abscisse du bord supérieur gauche.
 * @param {number} y  L'ordonnée du bord supérieur gauche.
 * @param {number} width  La largeur du rectangle.
 * @param {number} height  La hauteur du rectangle.
 * @returns {Rect}
 */
function Rect (x, y, width, height) {
  this.x = x
  this.y = y
  this.width = width
  this.height = height
}

Rect.prototype.setClone = function (rect) {
  this.x = rect.x
  this.y = rect.y
  this.width = rect.width
  this.height = rect.height
}

Rect.prototype.contains = function (xt, yt) {
  return (xt >= this.x) && (yt >= this.y) && (xt <= this.x + this.width) && (yt <= this.y + this.height)
}
