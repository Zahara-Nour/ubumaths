/*
 * Created by yvesb on 26/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CVecteur from '../objets/CVecteur'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilVect

/**
 * Outil servant à créer une vecteur en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilVect (app) {
  OutilObjetPar2Pts.call(this, app, 'Vect', 32788, true)
}

OutilVect.prototype = new OutilObjetPar2Pts()

OutilVect.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CVecteur(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(),
    pt1, pt2, app.getStyleFleche())
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilVect.prototype.creationPointPossible = function () {
  return true
}

OutilVect.prototype.isArrowTool = function () {
  return true
}

OutilVect.prototype.isLineTool = function () {
  return true
}
