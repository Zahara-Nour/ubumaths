/*
 * Created by yvesb on 10/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CArcDeCercleIndirect from '../objets/CArcDeCercleIndirect'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
export default OutilArcIndirect
/**
 * Outil servant à créer un arc de cercle indirect défini par origine, point de départ et point
 * donnant la direction de fin
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 */
function OutilArcIndirect (app) {
  OutilObjetPar3Pts.call(this, app, 'ArcIndirect', 33107, true)
}

OutilArcIndirect.prototype = new OutilObjetPar3Pts()

OutilArcIndirect.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CArcDeCercleIndirect(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2, pt3, null)
}

OutilArcIndirect.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCentre'
    case 2 : return 'debArc'
    case 3 : return 'finArc'
  }
}
/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilArcIndirect.prototype.creationPointPossible = function () {
  return true
}

OutilArcIndirect.prototype.preIndication = function () {
  return 'ArcIndirect'
}

OutilArcIndirect.prototype.isLineTool = function () {
  return true
}
