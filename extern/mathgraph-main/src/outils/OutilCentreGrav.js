/*
 * Created by yvesb on 27/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import MotifPoint from '../types/MotifPoint'
import StyleTrait from '../types/StyleTrait'
import CCentreGravite from '../objets/CCentreGravite'
import CMilieu from '../objets/CMilieu'
import CSegment from '../objets/CSegment'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'

export default OutilCentreGrav

/**
 * Outil servant à créer le centre de gravité d'un triangle
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCentreGrav (app) {
  OutilObjetPar3Pts.call(this, app, 'CentreGrav', 33063, true)
}

OutilCentreGrav.prototype = new OutilObjetPar3Pts()

OutilCentreGrav.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CCentreGravite(app.listePr, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, pt1, pt2, pt3)
}

OutilCentreGrav.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point1, this.point2)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(seg2)
  const seg3 = new CSegment(list, null, false, b, false, stfp, this.point1, app.mousePoint)
  app.ajouteObjetVisuel(seg3)
  const ob = this.objet(this.point1, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(ob)
  const mil1 = new CMilieu(list, null, false, b, true, 0, 0, true, '', 13, MotifPoint.petitRond, false, this.point1, this.point2)
  app.ajouteObjetVisuel(mil1)
  const mil2 = new CMilieu(list, null, false, b, true, 0, 0, true, '', 13, MotifPoint.petitRond, false, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(mil2)
  const mil3 = new CMilieu(list, null, false, b, true, 0, 0, true, '', 13, MotifPoint.petitRond, false, this.point1, app.mousePoint)
  app.ajouteObjetVisuel(mil3)
  const seg4 = new CSegment(list, null, false, b, false, stfp, this.point1, mil2)
  app.ajouteObjetVisuel(seg4)
  const seg5 = new CSegment(list, null, false, b, false, stfp, this.point2, mil3)
  app.ajouteObjetVisuel(seg5)
  const seg6 = new CSegment(list, null, false, b, false, stfp, app.mousePoint, mil1)
  app.ajouteObjetVisuel(seg6)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilCentreGrav.prototype.preIndication = function () {
  return 'CentreGrav'
}

OutilCentreGrav.prototype.isPointTool = function () {
  return true
}
