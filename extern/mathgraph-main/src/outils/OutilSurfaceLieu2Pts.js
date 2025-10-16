/*
 * Created by yvesb on 18/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CSurfaceLieuDeuxPoints from '../objets/CSurfaceLieuDeuxPoints'
import OutilObjetPar3Objets from './OutilObjetPar3Objets'

export default OutilSurfaceLieu2Pts

/**
 * Outil servant à créer une surface délimitée par un polygône, un cercle, un arc de cercle ou un lieu fermé
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSurfaceLieu2Pts (app) {
  OutilObjetPar3Objets.call(this, app, 'SurfaceLieu2Pts', 32872, true, NatObj.NLieu, NatObj.NTtPoint, NatObj.NTtPoint)
}

OutilSurfaceLieu2Pts.prototype = new OutilObjetPar3Objets()

// Opacité par défaut de 0.2 quand on crée une surface
OutilSurfaceLieu2Pts.prototype.isSurfTool = function () {
  return true
}

OutilSurfaceLieu2Pts.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indSurfLieuDte1'
    case 2 : return 'indSurfLieu2pts2'
    case 3 : return 'indSurfLieu2pts3'
  }
}

OutilSurfaceLieu2Pts.prototype.objet = function (ob1, ob2, ob3) {
  const app = this.app
  return new CSurfaceLieuDeuxPoints(app.listePr, null, false, app.getCouleur(), false, app.getStyleRemplissage(),
    ob1, ob2, ob3)
}

OutilSurfaceLieu2Pts.prototype.preIndication = function () {
  return 'SurfaceLieu2Pts'
}

OutilSurfaceLieu2Pts.prototype.isSurfTool = function () {
  return true
}
