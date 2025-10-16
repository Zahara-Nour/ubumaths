/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilAnnuler
/**
 * Outil annulant la dernière action sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilAnnuler (app) {
  Outil.call(this, app, 'Cancel', -1)
}
OutilAnnuler.prototype = new Outil()

OutilAnnuler.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.app.gestionnaire.annuleAction()
  this.app.activeOutilCapt()
}

OutilAnnuler.prototype.activationValide = function () {
  return this.app.gestionnaire.annulationPossible()
}
