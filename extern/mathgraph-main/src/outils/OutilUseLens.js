/*
 * Created by yvesb on 16/12/2024.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from './Outil'
export default OutilUseLens

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilUseLens (app) {
  Outil.call(this, app, 'UseLens', 33012, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilUseLens.prototype = new Outil()

OutilUseLens.prototype.select = function () {
  const app = this.app
  app.useLens = !app.useLens
  const btn = this.app['button' + this.toolName]
  btn.activate(app.useLens)
  if (app.electron) setUseLens(app.useLens) // eslint-disable-line no-undef
  else {
    if (app.pwa) localStorage.setItem('useLens', app.useLens.toString())
  }
}
