/*
 * Created by yvesb on 07/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilRecalculer

/**
 * Outil servant à créer une vecteur en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilRecalculer (app) {
  Outil.call(this, app, 'Recalculer', 32018, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilRecalculer.prototype = new Outil()

OutilRecalculer.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  list.deleteTraces()
  list.positionneFull(true, app.dimf)
  list.update(app.svgFigure, app.doc.couleurFond, true)
  this.saveFig()
}
