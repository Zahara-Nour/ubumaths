/*
 * Created by yvesb on 21/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteAB from '../objets/CDroiteAB'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilDtAB
/**
 * Outil servant à créer une droite définie par deux points
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtAB (app) {
  OutilObjetPar2Pts.call(this, app, 'DtAB', 32783, true)
}

OutilDtAB.prototype = new OutilObjetPar2Pts()

OutilDtAB.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CDroiteAB(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt1, pt2)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtAB.prototype.creationPointPossible = function () {
  return true
}

OutilDtAB.prototype.preIndication = function () {
  return 'DtAB'
}

OutilDtAB.prototype.isLineTool = function () {
  return true
}
