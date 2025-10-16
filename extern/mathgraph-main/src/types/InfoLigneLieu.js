/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
export default InfoLigneLieu
/**
 * Classe utilisée pour décrire chaque portion d'un lieu de points.
 * @constructor
 * @returns {InfoLigneLieu}
 */
function InfoLigneLieu () {
  this.indicePremierPoint = 0
  this.nombrePoints = 0
}
/**
 * Fait de this une copie de info
 * @param {InfoLigneLieu} info
 * @returns {void}
 */
InfoLigneLieu.prototype.setCopy = function (info) {
  this.indicePremierPoint = info.indicePremierPoint
  this.nombrePoints = info.nombrePoints
}
