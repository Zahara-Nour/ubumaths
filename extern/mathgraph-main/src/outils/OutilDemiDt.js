/*
 * Created by yvesb on 22/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroiteOA from '../objets/CDemiDroiteOA'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilDemiDt
/**
 * Outil servant à créer une demi droite OutilDemiDt
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 */
function OutilDemiDt (app) {
  OutilObjetPar2Pts.call(this, app, 'DemiDt', 32840, true)
}

OutilDemiDt.prototype = new OutilObjetPar2Pts()

OutilDemiDt.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CDemiDroiteOA(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDemiDt.prototype.creationPointPossible = function () {
  return true
}

OutilDemiDt.prototype.preIndication = function () {
  return 'Ddte'
}

OutilDemiDt.prototype.isLineTool = function () {
  return true
}
