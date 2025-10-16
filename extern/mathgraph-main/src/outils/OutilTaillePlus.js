/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilTaillePlus

/**
 * Outil servant à zoomer sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilTaillePlus (app) {
  Outil.call(this, app, 'TaillePlus', -1, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilTaillePlus.prototype = new Outil()

OutilTaillePlus.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  const svg = app.svgFigure
  const done = list.taillePlus()
  if (done) {
    list.positionne(false, app.dimf)
    list.updateDisplays(svg, app.doc.couleurFond, true)
    this.saveFig(false)
  }
}
