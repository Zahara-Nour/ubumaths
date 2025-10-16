/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default Pointeur
/**
 * Objet servant à contenir un pointeur sur un autre objet.
 * @constructor
 * @param {Object} valInit
 * @returns {Pointeur}
 */
function Pointeur (valInit) {
  if (arguments.length === 0) this.pointeur = null
  else this.pointeur = valInit
}
// Modifié version new
Pointeur.prototype.setValue = function (el) {
  this.pointeur = el
}
/**
 *
 * @returns {null|CElementBase|*}
 */
Pointeur.prototype.getValue = function () {
  return this.pointeur
}
