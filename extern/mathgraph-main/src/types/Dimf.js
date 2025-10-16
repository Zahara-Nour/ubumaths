/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { distancePointPoint } from '../kernel/kernel'
export default Dimf
/**
 * Classe utilisée pour représenter les dimensions du svg contenant la figure.
 * @constructor
 * @param {number|SVGElement} x  Dimension horizontale ou svg dont on récupère les dimensions
 * @param {number} y  Dimension verticale
 * @returns {Dimf}
 */
function Dimf (x, y) {
  if (arguments.length === 1) {
    this.x = parseInt(x.getAttribute('width'))
    this.y = parseInt(x.getAttribute('height'))
  } else {
    this.x = x
    this.y = y
  }
}

/**
 * Fonction testant si le point de coordonnées (xtest,ytest) est dans la feenêtre
 * @param {number} xtest  Abscisse du test.
 * @param {number} ytest  Ordonnée du test.
 * @returns {boolean}
 */
Dimf.prototype.dansFenetre = function (xtest, ytest) {
  return ((xtest >= 0) && (xtest <= this.x) && (ytest >= 0) && (ytest <= this.y))
}

/**
 * Fonction renvyant true si le cercle de centre (cx,cy) et de rayon rayon est dans la fenêtre et false sinon.
 * @param cx
 * @param cy
 * @param rayon
 * @returns {boolean}
 */
Dimf.prototype.testCercleDansFen = function (cx, cy, rayon) {
  const d1 = distancePointPoint(cx, cy, 0, 0)
  const d2 = distancePointPoint(cx, cy, 0, this.y)
  const d3 = distancePointPoint(cx, cy, this.x, 0)
  const d4 = distancePointPoint(cx, cy, this.x, this.y)
  if ((rayon >= d1) && (rayon >= d2) && (rayon >= d3) && (rayon >= d4)) return false
  if (this.dansFenetre(cx, cy)) return true
  if (cx > this.x) {
    if (cy > this.y) return rayon >= d4
    else if (cy < 0) return rayon >= d3
    else return rayon >= cx - this.x
  } else {
    if (cx < 0) {
      if (cy > this.y) return rayon >= d2
      else if (cy < 0) return rayon >= d1
      else return rayon >= -cx
    } else {
      if (cy < 0) return rayon >= -cy
      else return rayon >= cy - this.y
    }
  }
}
