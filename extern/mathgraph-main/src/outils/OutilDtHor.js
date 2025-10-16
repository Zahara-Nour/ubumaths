/*
 * Created by yvesb on 27/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CDroiteDirectionFixe from '../objets/CDroiteDirectionFixe'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
export default OutilDtHor
/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtHor (app) {
  OutilObjetPar1Objet.call(this, app, 'DtHor', 32862, true, NatObj.NTtPoint)
}

OutilDtHor.prototype = new OutilObjetPar1Objet()

OutilDtHor.prototype.indication = function () {
  return 'indPt'
}

OutilDtHor.prototype.objet = function (pt) {
  const app = this.app
  return new CDroiteDirectionFixe(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt, true, 1)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtHor.prototype.creationPointPossible = function () {
  return true
}

OutilDtHor.prototype.preIndication = function () {
  return 'DtHor'
}

OutilDtHor.prototype.isLineTool = function () {
  return true
}
