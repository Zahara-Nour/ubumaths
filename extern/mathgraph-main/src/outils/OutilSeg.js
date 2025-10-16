/*
 * Created by yvesb on 23/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSegment from '../objets/CSegment'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilSeg
/**
 * Outil servant à créer une segment en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSeg (app) {
  OutilObjetPar2Pts.call(this, app, 'Seg', 32784, true)
}

OutilSeg.prototype = new OutilObjetPar2Pts()

OutilSeg.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CSegment(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilSeg.prototype.creationPointPossible = function () {
  return true
}

OutilSeg.prototype.preIndication = function () {
  return 'Seg'
}

OutilSeg.prototype.isLineTool = function () {
  return true
}
