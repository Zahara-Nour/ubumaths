/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroBoucleAvecAnimation from '../objets/CMacroBoucleAvecAnimation'
import CAffLiePt from '../objets/CAffLiePt'
import MacBoucDlg from '../dialogs/MacBoucDlg'

export default OutilMacBoucAnim

/**
 * Outil servant à créer une macro affectant une valeur à une variable
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacBoucAnim (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacBoucAnim', 33031)
}

OutilMacBoucAnim.prototype = new OutilMac()

OutilMacBoucAnim.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  this.addComClign(point)
  this.mac = new CMacroBoucleAvecAnimation(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', 10, true, null, null, null)
  new MacBoucDlg(app, this.mac, false,
    function () {
      self.creeObjet()
      app.activeOutilCapt()
    },
    function () {
      app.activeOutilCapt()
    })
}
