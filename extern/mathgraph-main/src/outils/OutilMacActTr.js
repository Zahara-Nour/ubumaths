/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroModeTraceActivation from '../objets/CMacroModeTraceActivation'
import MacActTrDlg from '../dialogs/MacActTrDlg'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacActTr

/**
 * Outil servant à créer une macro activant le mode trace de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacActTr (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacActTr', 33166)
}

OutilMacActTr.prototype = new OutilMac()

OutilMacActTr.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroModeTraceActivation(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '')
  new MacActTrDlg(app, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}
