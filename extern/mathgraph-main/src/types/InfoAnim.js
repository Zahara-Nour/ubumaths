/*
 * Created by yvesb on 03/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
* https://www.mathgraph32.org/
* @Author Yves Biton (yves.biton@sesamath.net)
* @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
  */
export default InfoAnim
/**
 * Classe contenant des informations sur un lieu de points.
 * @constructor
 * @param nbPts Integer Le nombre de points pour la trace
 * @param freq Integer La fréquence d'animation en millièmes de seconde
 * @param {boolean} animCycl  true si l'animation est cyclique
 * @param {boolean} invSens  true si l'animation est inversée
 * Si un seul paramètre est passé c'est que c'est une macro d'animation ou d'animation avec traces
 */
function InfoAnim (nbPts, freq, animCycl, invSens) {
  if (arguments.length !== 1) {
    this.nbPts = nbPts
    this.freq = freq
    this.animCycl = animCycl
    this.invSens = invSens
  } else {
    const mac = arguments[0]
    this.nbPts = mac.nombrePointsPourAnimation
    this.freq = mac.frequenceAnimationMacro
    this.animCycl = mac.animationCyclique
    this.invSens = mac.inverserSens
  }
}

InfoAnim.prototype.set = function (nbPoints, freq, animCycl, invSens) {
  this.nbPts = nbPoints
  this.freq = freq
  this.animCycl = animCycl
  this.invSens = invSens
}
