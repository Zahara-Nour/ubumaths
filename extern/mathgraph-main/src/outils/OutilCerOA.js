/*
 * Created by yvesb on 22/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleOA from '../objets/CCercleOA'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilCerOA
/**
 * Outil servant à créer un cercle défini apr centre et point
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 */
function OutilCerOA (app) {
  OutilObjetPar2Pts.call(this, app, 'CerOA', 32794, true)
}

OutilCerOA.prototype = new OutilObjetPar2Pts()

OutilCerOA.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCentre'
    case 2 : return 'indPtCer'
  }
}

OutilCerOA.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CCercleOA(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), pt1, pt2)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilCerOA.prototype.creationPointPossible = function () {
  return true
}

OutilCerOA.prototype.preIndication = function () {
  return 'CerOA'
}

OutilCerOA.prototype.isLineTool = function () {
  return true
}
