/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Nat from '../types/Nat'
import NatObj from '../types/NatObj'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import CSurfaceArc from '../objets/CSurfaceArc'
export default OutilSurfaceArc

/**
 * Outil servant à créer une surface délimitée par un arc de cercle et sa corde
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSurfaceArc (app) {
  const nat = Nat.or(NatObj.NLieu, NatObj.NArc)
  OutilObjetPar1Objet.call(this, app, 'SurfaceArc', 32901, true, nat, nat)
}

OutilSurfaceArc.prototype = new OutilObjetPar1Objet()

OutilSurfaceArc.prototype.isSurfTool = function () {
  return true
}

OutilSurfaceArc.prototype.indication = function (ind) {
  return 'indSurfArc'
}
// Pas d'objet visuels pour cet outil
OutilSurfaceArc.prototype.ajouteObjetsVisuels = function () {
}

OutilSurfaceArc.prototype.objet = function (arc) {
  const app = this.app
  const li = app.listePr
  const coul = app.getCouleur()
  const style = app.getStyleRemplissage()
  return new CSurfaceArc(li, null, false, coul, false, style, arc)
}

OutilSurfaceArc.prototype.preIndication = function () {
  return 'SurfaceArc'
}

OutilSurfaceArc.prototype.isSurfTool = function () {
  return true
}
