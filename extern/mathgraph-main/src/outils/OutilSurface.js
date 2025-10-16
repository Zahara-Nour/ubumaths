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
import Nat from '../types/Nat'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import CSurfacePolygone from '../objets/CSurfacePolygone'
import CSurfaceDisque from '../objets/CSurfaceDisque'
import CSurfaceSecteurCirculaire from '../objets/CSurfaceSecteurCirculaire'
import CSurfaceLieu from '../objets/CSurfaceLieu'
export default OutilSurface

/**
 * Outil servant à créer une surface délimitée par un polygône, un cercle, un arc de cercle ou un lieu fermé
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSurface (app) {
  OutilObjetPar1Objet.call(this, app, 'Surface', 32866, true, Nat.or(NatObj.NPolygone, NatObj.NCercle, NatObj.NArc, NatObj.NLieu))
}

OutilSurface.prototype = new OutilObjetPar1Objet()

// Opacité par défaut de 0.2 quand on crée une surface
OutilSurface.prototype.isSurfTool = function () {
  return true
}

OutilSurface.prototype.indication = function () {
  return 'indSurface'
}

OutilSurface.prototype.objet = function (pt) {
  const app = this.app
  const li = app.listePr
  const coul = app.getCouleur()
  const style = app.getStyleRemplissage()
  switch (pt.getNature()) {
    case NatObj.NPolygone :
      return new CSurfacePolygone(li, null, false, coul, false, style, pt)
    case NatObj.NCercle :
      return new CSurfaceDisque(li, null, false, coul, false, style, pt)
    case NatObj.NArc :
      return new CSurfaceSecteurCirculaire(li, null, false, coul, false, style, pt)
    case NatObj.NLieu :
      return new CSurfaceLieu(li, null, false, coul, false, style, pt)
  }
}

OutilSurface.prototype.ajouteObjetsVisuels = function () { // Rien pour cet outil
}

OutilSurface.prototype.preIndication = function () {
  return 'Surf'
}

OutilSurface.prototype.isSurfTool = function () {
  return true
}
