/*
 * Created by yvesb on 28/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
import StyleTrait from '../types/StyleTrait'
export default OutilMarqueAng
/**
 * Outil servant à créer une bissectrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMarqueAng (app) {
  OutilObjetPar3Pts.call(this, app, 'MarqueAng', 32841, true)
}

OutilMarqueAng.prototype = new OutilObjetPar3Pts()

OutilMarqueAng.prototype.select = function () {
  // Pour créer une marque d'angle on active par défaut le style de trait continu
  const app = this.app
  app.lineStyle = StyleTrait.styleTraitContinu
  OutilObjetPar3Pts.prototype.select.call(this)
}

OutilMarqueAng.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CMarqueAngleGeometrique(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(),
    app.getStyleMarqueAngle(), 16, pt1, pt2, pt3)
}

OutilMarqueAng.prototype.preIndication = function () {
  return 'MarqueAng'
}

OutilMarqueAng.prototype.isAngleTool = function () {
  return true
}

OutilMarqueAng.prototype.isLineTool = function () {
  return true
}

// Opacité par défaut de 0.2 quand on crée une marque d'angle
OutilMarqueAng.prototype.isSurfTool = function () {
  return true
}
