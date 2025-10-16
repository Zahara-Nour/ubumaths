/*
 * Created by yvesb on 18/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import constantes from '../kernel/constantes'
export default OutilZoomMoins

/**
 * Outil servant à dézoomer sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilZoomMoins (app) {
  Outil.call(this, app, 'ZoomMoins', 32906, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilZoomMoins.prototype = new Outil()

OutilZoomMoins.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  const dimf = app.dimf
  const rep = list.premierRepVis()
  const x = rep !== null ? rep.o.x : dimf.x / 2
  const y = rep !== null ? rep.o.y : dimf.y / 2
  list.zoom(x, y, constantes.rapportZoomMoins)
  list.positionne(false, dimf)
  list.update(app.svgFigure, app.doc.couleurFond, true)
  app.gestionnaire.enregistreFigureEnCoursPourZoom()
}
