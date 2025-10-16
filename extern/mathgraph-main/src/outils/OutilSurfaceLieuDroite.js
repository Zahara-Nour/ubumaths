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
import CSurfaceLieuDroite from '../objets/CSurfaceLieuDroite'
import OutilObjetPar2Objets from './OutilObjetPar2Objets'
export default OutilSurfaceLieuDroite

/**
 * Outil servant à créer une surface délimitée par un polygône, un cercle, un arc de cercle ou un lieu fermé
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSurfaceLieuDroite (app) {
  OutilObjetPar2Objets.call(this, app, 'SurfaceLieuDroite', 32867, true, NatObj.NLieu, NatObj.NDroite)
}

OutilSurfaceLieuDroite.prototype = new OutilObjetPar2Objets()

// Opacité par défaut de 0.2 quand on crée une surface
OutilSurfaceLieuDroite.prototype.isSurfTool = function () {
  return true
}

OutilSurfaceLieuDroite.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indSurfLieuDte1'
    case 2 : return 'indSurfLieuDte2'
  }
}

OutilSurfaceLieuDroite.prototype.objet = function (ob1, ob2) {
  const app = this.app
  return new CSurfaceLieuDroite(app.listePr, null, false, app.getCouleur(), false, app.getStyleRemplissage(), ob1, ob2)
}

OutilSurfaceLieuDroite.prototype.preIndication = function () {
  return 'SurfaceLieuDroite'
}

OutilSurfaceLieuDroite.prototype.isSurfTool = function () {
  return true
}
