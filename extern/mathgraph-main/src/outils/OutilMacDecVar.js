/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMacIncVar from '../outils/OutilMacIncVar'
import CMacroDecrementationVariable from '../objets/CMacroDecrementationVariable'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacDecVar

/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacDecVar (app) {
  OutilMacIncVar.call(this, app)
}

OutilMacDecVar.prototype = new OutilMacIncVar()

/**
 * Fonction qui sera redéfinie dans OutilMacDecVar et renverra false
 * @returns {boolean}
 */
OutilMacDecVar.prototype.isMacInc = function () {
  return false
}

/**
 * Fonction créant la macro qui sera redéfinie dans OutilMacDis^p
 * @param point
 */
OutilMacDecVar.prototype.createMac = function (point) {
  const app = this.app
  return new CMacroDecrementationVariable(app.listePr, null, false, app.getCouleur(), point.x, point.y, 0, 0, false,
    null, 16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
    CAffLiePt.alignVerTop, '', '', null)
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacDecVar.prototype.actionFin = function () {
  this.creeObjet()
}
