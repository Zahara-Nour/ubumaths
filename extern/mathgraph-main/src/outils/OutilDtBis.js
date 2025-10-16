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
import CPointProjete from '../objets/CPointProjete'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import CSegment from '../objets/CSegment'
import CBissectrice from '../objets/CBissectrice'
import OutilObjetPar3Pts from './OutilObjetPar3Pts'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import CPointLieDroite from '../objets/CPointLieDroite'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'
export default OutilDtBis

/**
 * Outil servant à créer une bissectrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtBis (app) {
  OutilObjetPar3Pts.call(this, app, 'DtBis', 32791, true)
}

OutilDtBis.prototype = new OutilObjetPar3Pts()

OutilDtBis.prototype.objet = function (pt1, pt2, pt3) {
  const app = this.app
  return new CBissectrice(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt1, pt2, pt3)
}

OutilDtBis.prototype.creeObjet = function () {
  const app = this.app
  const pasDejaCree = OutilObjetPar3Pts.prototype.creeObjet.call(this, !app.autoComplete)
  if (!pasDejaCree) return false
  if (!app.autoComplete) return true
  const dimf = app.dimf
  const svg = app.svgFigure
  const coulfond = app.doc.couleurFond
  const coul = app.getCouleur()
  const coulRemp = new Color(coul.red, coul.green, coul.blue, defaultSurfOpacity)
  // Si app.autoComplete est à true et si la médiatrice n'a pas été déjà créé,et si le milieu du sgement
  // n'a pas déjà été créé, on rajoute le milieu, deux segments joignant les extrémités au segment
  // deux marques de segment et une marque d'angle droit
  const list = app.listePr
  const len = list.longueur()
  const seg1 = new CSegment(list, null, false, coul, false, app.getStyleTrait(), this.point1, this.point2)
  if (!app.objetDejaCree(seg1)) {
    list.add(seg1)
    seg1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  }
  const seg2 = new CSegment(list, null, false, coul, false, app.getStyleTrait(), this.point3, this.point2)
  if (!app.objetDejaCree(seg2)) {
    list.add(seg2)
    seg2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  }
  const bis = list.get(len - 1) // a été rajouté à liste par OutilPar3Pts.prototype.creeObjet
  const ptlie = new CPointLieDroite(list, null, false, app.getCouleur(), false, 3, 0, true, '', 16, MotifPoint.petitRond, false, false, 0.25, bis)
  list.add(ptlie)
  const styleTrait = new StyleTrait(list, StyleTrait.styleTraitContinu, 2)
  const marque1 = new CMarqueAngleGeometrique(list, null, false, coulRemp, false, styleTrait, app.getStyleMarqueAngle(), 18, this.point1, this.point2, ptlie, false)
  const marque2 = new CMarqueAngleGeometrique(list, null, false, coulRemp, false, styleTrait, app.getStyleMarqueAngle(), 22, this.point3, this.point2, ptlie, false)
  list.add(marque1)
  list.add(marque2)
  ptlie.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  marque1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  marque2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  this.saveFig()
  this.reselect()
  return true
}

// On redéfinit ajouteObjetsVisuels car il y en a d'autres à part la bissectrice elle-même
OutilDtBis.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point1, this.point2)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(seg2)
  const bis = this.objet(this.point1, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(bis)
  const ptproj = new CPointProjete(list, null, false, b, true, 0, 0, true, '', 13, MotifPoint.petitRond,
    false, this.point1, bis)
  app.ajouteObjetVisuel(ptproj)
  const coul = app.getCouleur()
  const coulRemp = app.autoComplete ? new Color(coul.red, coul.green, coul.blue, defaultSurfOpacity) : b
  const styleTrait = new StyleTrait(list, StyleTrait.styleTraitContinu, 2)
  const styleMarqueAngle = app.autoComplete ? app.getStyleMarqueAngle() : StyleMarqueAngle.marqueSimple
  const mar1 = new CMarqueAngleGeometrique(list, null, false, coulRemp, false,
    styleTrait, styleMarqueAngle, 13, this.point1, this.point2, ptproj)
  app.ajouteObjetVisuel(mar1)
  const mar2 = new CMarqueAngleGeometrique(list, null, false, coulRemp, false,
    styleTrait, styleMarqueAngle, 16, app.mousePoint, this.point2, ptproj)
  app.ajouteObjetVisuel(mar2)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtBis.prototype.creationPointPossible = function () {
  return true
}

OutilDtBis.prototype.preIndication = function () {
  return 'DtBis'
}

OutilDtBis.prototype.isLineTool = function () {
  return true
}

// Si on est en mode complétion automatique on met aussi les styles de marques
// d'angle dans la palette de droite quand cet outil est activé.
OutilDtBis.prototype.isAngleTool = function () {
  return this.app.autoComplete
}
