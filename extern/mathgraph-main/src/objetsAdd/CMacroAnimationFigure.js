/*
 * Created by yvesb on 30/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAffLiePt from '../objets/CAffLiePt'
import CMacroAnimationPointLie from '../objets/CMacroAnimationPointLie'
export default CMacroAnimationFigure

/**
 * Macro servant à exécuter l'outil d'animation d'un point lié de la figure
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @constructor
 */
function CMacroAnimationFigure (app) {
  CMacroAnimationPointLie.call(this, app.listePr, null, false, null,
    0, 0, 0, 0, true, null, 0, false, null,
    CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', '', true, 20, 100,
    0, null, false, true, false)
  this.app = app
  this.timer = null
}

CMacroAnimationFigure.prototype = new CMacroAnimationPointLie()

/**
 * Fonction terminant l'action d'animation d'un point lié de la figure
 * @param {SVGElement} svg
 * @param {Dimf} dimf
 * @param {string} couleurFond
 * @param transparence
 * @param {boolean} bReselect Si true on resélectionne l'otuil d'animation
 */
CMacroAnimationFigure.prototype.termineAction = function (svg, dimf, couleurFond, bReselect = true) {
  clearInterval(this.timer)
  this.timer = null
  this.executionEnCours = false
  if (this.retourDepart && (this.pointLieAssocie !== null)) this.pointLieAssocie.donneAbscisse(this.abscisseInitiale)
  this.listeDep.positionne(false, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.passageMacroSuiv(svg, dimf, couleurFond)
  // this.app.activeOutilCapt();
  if (bReselect) this.app.outilAnimation.reselect()
}

CMacroAnimationFigure.prototype.resetTimer = function () {
  if (this.timer !== null) clearInterval(this.timer)
}
