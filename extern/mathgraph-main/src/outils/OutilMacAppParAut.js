/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CAffLiePt from '../objets/CAffLiePt'
import CMacroApparition from '../objets/CMacroApparition'
import MacAppDispParAutDlg from '../dialogs/MacAppDispParAutDlg'

export default OutilMacAppParAut

/**
 * Outil servant à mesurer en créer une macro d'apparition d'objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAppParAut (app) {
  if (arguments.length === 0) return
  const b = this.isMacApp()
  OutilMac.call(this, app, b ? 'MacAppParAut' : 'MacDispParAut', b ? 33111 : 33110)
}

OutilMacAppParAut.prototype = new OutilMac()

OutilMacAppParAut.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  this.addComClign(point)
  this.mac = this.createMac(point)
  new MacAppDispParAutDlg(app, this.isMacApp(), this.mac,
    function () {
      app.activeOutilCapt()
    },
    function () { app.activeOutilCapt() })
}

/**
 * Fonction qui sera redéfinie dans OutilMacDispParAut et renverra false
 * @returns {boolean}
 */
OutilMacAppParAut.prototype.isMacApp = function () {
  return true
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacAppParAut.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroApparition(app.listePr, null, false, app.getCouleur(), point.x, point.y,
    0, 0, false, null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', null, false)
}

OutilMacAppParAut.prototype.activationValide = function () {
  return this.app.listePr.listeMacrosAvecListeModif(false).noms.length > 0
}
