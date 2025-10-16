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
import CSurfaceDeuxLieux from '../objets/CSurfaceDeuxLieux'
import OutilObjetPar2Objets from './OutilObjetPar2Objets'
export default OutilSurface2Lieux

/**
 * Outil servant à créer une surface délimitée par un polygône, un cercle, un arc de cercle ou un lieu fermé
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSurface2Lieux (app) {
  OutilObjetPar2Objets.call(this, app, 'Surface2Lieux', 32871, true, NatObj.NLieu, NatObj.NLieu)
}

OutilSurface2Lieux.prototype = new OutilObjetPar2Objets()

// Opacité par défaut de 0.2 quand on crée une surface
OutilSurface2Lieux.prototype.isSurfTool = function () {
  return true
}

OutilSurface2Lieux.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indSurf2Lieux1'
    case 2 : return 'indSurf2Lieux2'
  }
}

OutilSurface2Lieux.prototype.objet = function (ob1, ob2) {
  const app = this.app
  return new CSurfaceDeuxLieux(app.listePr, null, false, app.getCouleur(), false, app.getStyleRemplissage(), ob1, ob2)
}

OutilSurface2Lieux.prototype.preIndication = function () {
  return 'Surface2Lieux'
}

OutilSurface2Lieux.prototype.isSurfTool = function () {
  return true
}
