/*
 * Created by yvesb on 29/09/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CPointImage from '../objets/CPointImage'
import CTranslation from '../objets/CTranslation'
import CSegment from '../objets/CSegment'
import OutilPar3Pts from './OutilPar3Pts'

export default OutilParallelog
/**
 * Outil servant à créer une bissectrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilParallelog (app) {
  OutilPar3Pts.call(this, app, 'Parallelog', 33034, true)
}

OutilParallelog.prototype = new OutilPar3Pts()

OutilParallelog.prototype.preIndication = function () {
  return 'Parallelog'
}

OutilParallelog.prototype.creeObjet = function () {
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  this.annuleClignotement()
  const trans = new CTranslation(li, null, false, this.point2, this.point1)
  app.ajouteElement(trans)
  const pt4 = new CPointImage(li, null, false, app.getCouleur(), false, 3, 0, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, this.point3, trans)
  app.ajouteElement(pt4)
  app.addSegment(this.point1, this.point2)
  app.addSegment(this.point2, this.point3)
  app.addSegment(this.point3, pt4)
  app.addSegment(pt4, this.point1)
  app.addPolygon(this.point1, this.point2, this.point3, pt4, this.point1)
  li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  this.saveFig()
  this.nbPtsCrees = 0
  return true
  // app.activeOutilCapt();
}

OutilParallelog.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const li = app.listeObjetsVisuels
  const b = Color.black
  const stfp = new StyleTrait(li, StyleTrait.styleTraitPointille, 1)// var pt1 = this.point1.getClone(app.listePr,li);
  const trans = new CTranslation(li, null, false, this.point2, this.point1)
  app.ajouteObjetVisuel(trans)
  const pt4 = new CPointImage(li, null, false, app.getCouleur(), false, 3, 0, false, '', 13, app.getStylePoint(), false, app.mousePoint, trans)
  app.ajouteObjetVisuel(pt4)
  const seg1 = new CSegment(li, null, false, b, false, stfp, this.point1, this.point2)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(li, null, false, b, false, stfp, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(seg2)
  const seg3 = new CSegment(li, null, false, b, false, stfp, app.mousePoint, pt4)
  app.ajouteObjetVisuel(seg3)
  const seg4 = new CSegment(li, null, false, b, false, stfp, pt4, this.point1)
  app.ajouteObjetVisuel(seg4)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilParallelog.prototype.creationPointPossible = function () {
  return true
}

OutilParallelog.prototype.preIndication = function () {
  return 'Parallelog'
}

OutilParallelog.prototype.isPointTool = function () {
  return true
}

OutilParallelog.prototype.isLineTool = function () {
  return true
}
