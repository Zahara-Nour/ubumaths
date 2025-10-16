/*
 * Created by yvesb on 28/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilObjetPar3Pts from './OutilObjetPar3Pts'
import CMarqueAngleOrienteIndirecte from '../objets/CMarqueAngleOrienteIndirecte'
import StyleTrait from '../types/StyleTrait'
export default OutilMarqueAngOrSI

/**
 * Outil servant à créer une bissectrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMarqueAngOrSI (app) {
  OutilObjetPar3Pts.call(this, app, 'MarqueAngOrSI', 33048, true)
}

OutilMarqueAngOrSI.prototype = new OutilObjetPar3Pts()

OutilMarqueAngOrSI.prototype.select = function () {
  // Pour créer une marque d'angle on active par défaut le style de trait continu
  const app = this.app
  app.lineStyle = StyleTrait.styleTraitContinu
  OutilObjetPar3Pts.prototype.select.call(this)
}

// Opacité par défaut de 0.2 quand on crée une marque d'angle
OutilMarqueAngOrSI.prototype.isSurfTool = function () {
  return true
}

OutilMarqueAngOrSI.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CMarqueAngleOrienteIndirecte(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(),
    app.getStyleMarqueAngle(), 16, pt1, pt2, pt3, app.getStyleFleche())
}

OutilMarqueAngOrSI.prototype.preIndication = function () {
  return 'MarqueAngOrSI'
}

OutilMarqueAngOrSI.prototype.isAngleTool = function () {
  return true
}

OutilMarqueAngOrSI.prototype.isArrowTool = function () {
  return true
}

OutilMarqueAngOrSI.prototype.isLineTool = function () {
  return true
}
