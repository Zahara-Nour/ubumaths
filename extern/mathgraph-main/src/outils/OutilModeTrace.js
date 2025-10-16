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
export default OutilModeTrace

/**
 * Outil servant à basculer entre le mode trace active et non active
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilModeTrace (app) {
  Outil.call(this, app, 'ModeTrace', 32019, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilModeTrace.prototype = new Outil()

OutilModeTrace.prototype.select = function () {
  const app = this.app
  const doc = app.doc
  doc.modeTraceActive = !doc.modeTraceActive
  app.listePr.deleteTraces()
  const btn = this.app['button' + this.toolName]
  btn.activate(doc.modeTraceActive)
}
