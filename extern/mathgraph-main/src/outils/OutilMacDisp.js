/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMacApp from '../outils/OutilMacApp'
import CMacroDisparition from '../objets/CMacroDisparition'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacDisp

/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacDisp (app) {
  OutilMacApp.call(this, app)
}

OutilMacDisp.prototype = new OutilMacApp()

/**
 * Fonction qui sera redéfinie dans OutilMacDisp et renverra false
 * @returns {boolean}
 */
OutilMacDisp.prototype.isMacApp = function () {
  return false
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacDisp.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroDisparition(app.listePr, null, false, app.getCouleur(), point.x, point.y,
    0, 0, false, null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', this.liste, false)
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacDisp.prototype.actionFin = function () {
  this.creeObjet()
}
