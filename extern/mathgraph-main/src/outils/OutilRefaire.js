/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilRefaire

/**
 * Outil servant à refaire la dernière action annulée sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilRefaire (app) {
  Outil.call(this, app, 'Refaire', -1)
}
OutilRefaire.prototype = new Outil()

OutilRefaire.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.app.gestionnaire.refaitAction()
  this.app.activeOutilCapt()
}

OutilRefaire.prototype.activationValide = function () {
  return this.app.gestionnaire.refairePossible()
}
