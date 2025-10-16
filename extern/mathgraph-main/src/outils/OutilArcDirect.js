/*
 * Created by yvesb on 10/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CArcDeCercleDirect from '../objets/CArcDeCercleDirect'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
export default OutilArcDirect
/**
 * Outil servant à créer un arc de cercle direct défini par origine, point de départ et point
 * donnant la direction de fin
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 */
function OutilArcDirect (app) {
  OutilObjetPar3Pts.call(this, app, 'ArcDirect', 33106, true)
}

OutilArcDirect.prototype = new OutilObjetPar3Pts()

OutilArcDirect.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CArcDeCercleDirect(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2, pt3, null)
}

OutilArcDirect.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCentre'
    case 2 : return 'debArc'
    case 3 : return 'finArc'
  }
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilArcDirect.prototype.creationPointPossible = function () {
  return true
}

OutilArcDirect.prototype.preIndication = function () {
  return 'ArcDirect'
}

OutilArcDirect.prototype.isLineTool = function () {
  return true
}
