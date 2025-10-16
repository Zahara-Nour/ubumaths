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
export default OutilModePointsAuto

/**
 * Outil servant à basculer entre le mode trace active et non active
 * @param {MtgApp} app L'application propriétaire
 * @extends Outil
 * @constructor
 */
function OutilModePointsAuto (app) {
  Outil.call(this, app, 'ModePointsAuto', 33011, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilModePointsAuto.prototype = new Outil()

OutilModePointsAuto.prototype.select = function () {
  const app = this.app
  app.pref_PointsAuto = !app.pref_PointsAuto
  const btn = this.app['button' + this.toolName]
  btn.activate(app.pref_PointsAuto)
  // Cette option est mémorisée pour la version electron
  if (app.electron) setPointsAuto(app.pref_PointsAuto) // eslint-disable-line no-undef
  else {
    if (app.pwa) localStorage.setItem('pointsAuto', app.pref_PointsAuto.toString())
  }
}
