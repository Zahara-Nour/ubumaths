/*
 * Created by yvesb on 24/06/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CCentreCercle from '../objets/CCentreCercle'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
export default OutilCentreCercle

/**
 * Outil servant à créer le centre d'un cercle
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCentreCercle (app) {
  // Dernier paramètre à false car pas d'icône associée
  OutilObjetPar1Objet.call(this, app, 'CentreCercle', 33155, true, NatObj.NCercle, false, false)
}

OutilCentreCercle.prototype = new OutilObjetPar1Objet()

OutilCentreCercle.prototype.indication = function () {
  return 'indCer'
}

OutilCentreCercle.prototype.objet = function (cer) {
  const app = this.app
  return new CCentreCercle(app.listePr, null, false, app.getCouleur(), false, 0, 3, false, '',
    app.getTaillePoliceNom(), app.getStylePoint(), false, cer)
}

// Pas d'objets visuels pour cet outil
OutilCentreCercle.prototype.ajouteObjetsVisuels = function () {
}

OutilCentreCercle.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilCentreCercle.isPointTool = function () {
  return true
}

OutilCentreCercle.prototype.isPointTool = function () {
  return true
}
