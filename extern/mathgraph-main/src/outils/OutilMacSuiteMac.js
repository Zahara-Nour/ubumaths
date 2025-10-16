/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroSuiteMacros from '../objets/CMacroSuiteMacros'
import MacSuiteMacDlg from '../dialogs/MacSuiteMacDlg'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacSuiteMac

/**
 * Outil servant à créer une macro affectant une valeur à une variable
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacSuiteMac (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacSuiteMac', 32995)
}

OutilMacSuiteMac.prototype = new OutilMac()

OutilMacSuiteMac.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroSuiteMacros(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '')
  new MacSuiteMacDlg(app, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}
