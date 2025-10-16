/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroAnimationPointlie from '../objets/CMacroAnimationPointLie'
import MacAnimDlg from '../dialogs/MacAnimDlg'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacAnim

/**
 * Outil servant à créer une macro d'animation de point lié sans trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAnim (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacAnim', 32946)
}

OutilMacAnim.prototype = new OutilMac()

OutilMacAnim.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroAnimationPointlie(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null,
      16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', true, 10, 100, 0, null, false, true, false)
    new MacAnimDlg(app, false, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageObjetClignotant
        app.outilPointageActif.aDesigner = NatObj.NPointLie
        app.listeClignotante.ajoutePointsLiesNonPun(list)
        app.outilPointageActif.aDesigner = NatObj.NPointLie
        app.outilPointageActif.reset(false, true)
        app.indication('indAnim')
      },
      function () {
        app.activeOutilCapt()
      })
  } else {
    this.mac.pointLieAssocie = elg
    this.annuleClignotement()
    this.creeObjet()
  }
}
