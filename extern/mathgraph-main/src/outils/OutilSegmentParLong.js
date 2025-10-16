/*
 * Created by yvesb on 27/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObj'
import SegmentParLongDlg from '../dialogs/SegmentParLongDlg'
export default OutilSegmentParLong

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSegmentParLong (app) {
  Outil.call(this, app, 'SegmentParLong', 32040, true)
}

OutilSegmentParLong.prototype = new Outil()

OutilSegmentParLong.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur l'extrémité gauche ou haute du curseur
  app.outilPointageActif = app.outilPointageClicOuPt
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indCurseur1', 'SegmentParLong')
}

OutilSegmentParLong.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  new SegmentParLongDlg(app, elg, app.outilPointageClicOuPt.bptCree)
}

OutilSegmentParLong.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}

OutilSegmentParLong.prototype.isPointTool = function () {
  return true
}

OutilSegmentParLong.prototype.isLineTool = function () {
  return true
}
