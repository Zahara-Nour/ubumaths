/*
 * Created by yvesb on 09/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'

export default OutilGomme
/**
 * Outil servant à démasquer des objest masqués
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilGomme (app) {
  Outil.call(this, app, 'Gomme', 32807, false)
}

OutilGomme.prototype = new Outil()

OutilGomme.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  this.cursor = 'default'
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtObj
  app.outilPointageActif.reset()
  this.cursor = 'default'
  app.indication('Gom')
}

OutilGomme.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  elg.cache()
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true)
  this.saveFig()
}

OutilGomme.prototype.isReadyForTouchEnd = function () {
  return false
}
