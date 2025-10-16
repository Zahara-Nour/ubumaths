/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CPointBase from '../objets/CPointBase'
export default OutilPtLib
/**
 * Outil servant à créer un point libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPtLib (app) {
  Outil.call(this, app, 'PtLib', 32779, false)
}
OutilPtLib.prototype = new Outil()

OutilPtLib.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indPtLib')
}

OutilPtLib.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const pt = new CPointBase(this.app.doc.listePr, null, false, this.app.getCouleur(), false,
    0, 3, false, '', app.getTaillePoliceNom(), app.getStylePoint(), false, false, point.x, point.y)
  this.app.ajouteElement(pt)
  pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.saveFig()
}

OutilPtLib.prototype.isPointTool = function () {
  return true
}
