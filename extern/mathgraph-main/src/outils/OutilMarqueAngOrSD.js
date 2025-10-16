/*
 * Created by yvesb on 28/09/2016.
 */
import CMarqueAngleOrienteDirecte from '../objets/CMarqueAngleOrienteDirecte'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
import StyleTrait from '../types/StyleTrait'
export default OutilMarqueAngOrSD
/**
 * Outil servant à créer une bissectrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMarqueAngOrSD (app) {
  OutilObjetPar3Pts.call(this, app, 'MarqueAngOrSD', 33047, true)
}

OutilMarqueAngOrSD.prototype = new OutilObjetPar3Pts()

OutilMarqueAngOrSD.prototype.select = function () {
  // Pour créer une marque d'angle on active par défaut le style de trait continu
  const app = this.app
  app.lineStyle = StyleTrait.styleTraitContinu
  OutilObjetPar3Pts.prototype.select.call(this)
}

// Opacité par défaut de 0.2 quand on crée une marque d'angle
OutilMarqueAngOrSD.prototype.isSurfTool = function () {
  return true
}

OutilMarqueAngOrSD.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CMarqueAngleOrienteDirecte(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(),
    app.getStyleMarqueAngle(), 16, pt1, pt2, pt3, app.getStyleFleche())
}

OutilMarqueAngOrSD.prototype.preIndication = function () {
  return 'MarqueAngOrSD'
}

OutilMarqueAngOrSD.prototype.isAngleTool = function () {
  return true
}

OutilMarqueAngOrSD.prototype.isArrowTool = function () {
  return true
}

OutilMarqueAngOrSD.prototype.isLineTool = function () {
  return true
}
