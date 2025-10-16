/*
 * Created by yvesb on 11/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObj'
import CurseurDlg from '../dialogs/CurseurDlg'
export default OutilCurseur

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCurseur (app) {
  Outil.call(this, app, 'Curseur', 33000, true)
}

OutilCurseur.prototype = new Outil()

OutilCurseur.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur l'extrémité gauche ou haute du curseur
  app.outilPointageActif = app.outilPointageClicOuPt
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indCurseur1', 'Curseur')
}

OutilCurseur.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  new CurseurDlg(app, elg, app.outilPointageClicOuPt.bptCree)
}

OutilCurseur.prototype.isPointTool = function () {
  return true
}

OutilCurseur.prototype.isLineTool = function () {
  return true
}
