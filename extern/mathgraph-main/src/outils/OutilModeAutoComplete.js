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
export default OutilModeAutoComplete

/**
 * Outil servant à basculer entre le mode trace complétion auto (milieux, médiatrices etc)
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilModeAutoComplete (app) {
  Outil.call(this, app, 'ModeAutoComplete', 34011, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilModeAutoComplete.prototype = new Outil()

OutilModeAutoComplete.prototype.select = function () {
  const app = this.app
  app.autoComplete = !app.autoComplete
  const btn = this.app['button' + this.toolName]
  btn.activate(app.autoComplete)
  // Cette option est mémorisée pour la version electron
  if (app.electron) setAutoComplete(app.autoComplete) // eslint-disable-line no-undef
  else {
    if (app.pwa) localStorage.setItem('autoComplete', app.autoComplete.toString())
  }
}
