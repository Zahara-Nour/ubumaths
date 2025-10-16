/*
 * Created by yvesb on 22/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleOAB from '../objets/CCercleOAB'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
import CVecteur from '../objets/CVecteur'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import CCercleOA from '../objets/CCercleOA'
export default OutilCerOAB
/**
 * Outil servant à créer un cercle défini apr centre et point
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 */
function OutilCerOAB (app) {
  OutilObjetPar3Pts.call(this, app, 'CerOAB', 33001, true, true, true)
}

OutilCerOAB.prototype = new OutilObjetPar3Pts()

OutilCerOAB.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indRay1'
    case 2 : return 'indRay2'
    case 3 : return 'indCentre'
  }
}

OutilCerOAB.prototype.preIndication = function () {
  return 'CerOAB'
}

OutilCerOAB.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  const list = app.listePr
  const coul = app.getCouleur()
  const style = app.getStyleTrait()
  if (pt3 === pt1) {
    return new CCercleOA(list, null, false, coul, false, style, pt1, pt2)
  } else {
    if (pt3 === pt2) {
      return new CCercleOA(list, null, false, coul, false, style, pt2, pt1)
    } else {
      return new CCercleOAB(app.listePr, null, false, coul, false, style, pt3, pt1, pt2)
    }
  }
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilCerOAB.prototype.creationPointPossible = function () {
  return true
}

OutilCerOAB.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const vect1 = new CVecteur(list, null, false, b, false, stfp, this.point1, this.point2, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(vect1)
  const vect2 = new CVecteur(list, null, false, b, false, stfp, this.point2, this.point1, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(vect2)
  const cer = new CCercleOAB(list, null, false, b, false, stfp, app.mousePoint, this.point1, this.point2)
  app.ajouteObjetVisuel(cer)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilCerOAB.prototype.isLineTool = function () {
  return true
}
