/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMacAppParAut from '../outils/OutilMacAppParAut'
import CMacroDisparition from '../objets/CMacroDisparition'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacDispParAut

/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacDispParAut (app) {
  OutilMacAppParAut.call(this, app)
}

OutilMacDispParAut.prototype = new OutilMacAppParAut()

/**
 * Fonction qui sera redéfinie dans OutilMacDispParAut et renverra false
 * @returns {boolean}
 */
OutilMacDispParAut.prototype.isMacApp = function () {
  return false
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacDispParAut.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroDisparition(app.listePr, null, false, app.getCouleur(), point.x, point.y,
    0, 0, false, null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', null)
}
