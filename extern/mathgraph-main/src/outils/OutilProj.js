/*
 * Created by yvesb on 25/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointProjete from '../objets/CPointProjete'
import OutilParDtPt from './OutilParDtPt'
import Cpt from '../objets/CPt'
import Color from '../types/Color'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import CSegment from '../objets/CSegment'
import StyleTrait from '../types/StyleTrait'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
export default OutilProj
/**
 * Outil servant à créer un projeté orthogonal d'un point
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilProj (app) {
  OutilParDtPt.call(this, app, 'Proj', 32780, true)
}

OutilProj.prototype = new OutilParDtPt()

OutilProj.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indProj1'
    case 2 : return 'indProj2'
  }
}

OutilProj.prototype.preIndication = function () {
  return 'Proj'
}

/**
 * Spécial version mtgApp. Renvoie l'objet à créer
 * Sera redéifni pour les descendants
 * @param pt
 * @param dt
 */
OutilProj.prototype.objet = function (pt, dt) {
  const app = this.app
  return new CPointProjete(app.listePr, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, pt, dt)
}

OutilProj.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfc = StyleTrait.stfc(list)
  const stfp = StyleTrait.stfp(list)
  const ptproj = this.objet(this.app.mousePoint, this.droite1)
  app.ajouteObjetVisuel(ptproj)
  // On crée un point qui représente un point de l'objet sur lequel on veut projeter
  const pt = new Cpt(list, null, false, b, true, 0, 0, true, '', 0, 0, false)
  pt.placeEn(this.droite1.point_x, this.droite1.point_y)
  app.ajouteObjetVisuel(pt)
  const seg = new CSegment(list, null, false, b, false, stfp, app.mousePoint, ptproj)
  app.ajouteObjetVisuel(seg)
  const ma = new CMarqueAngleGeometrique(list, null, false, b, false, stfc, StyleMarqueAngle.marqueSimple,
    12, pt, ptproj, app.mousePoint)
  app.ajouteObjetVisuel(ma)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilProj.prototype.isPointTool = function () {
  return true
}
