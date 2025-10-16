import Outil from './Outil'
export default OutilModeSelectRect

/**
 * Outil servant à basculer entre le mode où le rectangle de sélection est visible (et donc actif)
 * ou invisible (et donc inactif)
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilModeSelectRect (app) {
  Outil.call(this, app, 'ModeSelectRect', 34016, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilModeSelectRect.prototype = new Outil()

OutilModeSelectRect.prototype.select = function () {
  const app = this.app
  app.cadreVisible = !app.cadreVisible
  app.montreCadre(app.cadreVisible)
  this.app['button' + this.toolName].activate(app.cadreVisible)
}
