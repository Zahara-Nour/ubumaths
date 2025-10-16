/*
 * Created by yvesb on 10/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CGrandArcDeCercle from '../objets/CGrandArcDeCercle'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
export default OutilArcGrand
/**
 * Outil servant à créer un grand arc de cercle défini par origine, point de départ et point
 * donnant la direction de fin
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 */
function OutilArcGrand (app) {
  OutilObjetPar3Pts.call(this, app, 'ArcGrand', 33105, false)
}

OutilArcGrand.prototype = new OutilObjetPar3Pts()

OutilArcGrand.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CGrandArcDeCercle(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2, pt3, null)
}

OutilArcGrand.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCentre'
    case 2 : return 'debArc'
    case 3 : return 'finArc'
  }
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilArcGrand.prototype.creationPointPossible = function () {
  return true
}

OutilArcGrand.prototype.preIndication = function () {
  return 'ArcGrand'
}

OutilArcGrand.prototype.isLineTool = function () {
  return true
}
