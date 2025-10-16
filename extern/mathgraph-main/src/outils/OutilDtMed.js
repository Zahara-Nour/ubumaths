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
import StyleMarqueSegment from '../types/StyleMarqueSegment'
import MotifPoint from '../types/MotifPoint'
import StyleTrait from '../types/StyleTrait'
import CDroitePerpendiculaire from '../objets/CDroitePerpendiculaire'
import CMarqueAngleDroit from '../objets/CMarqueAngleDroit'
import CMarqueSegment from '../objets/CMarqueSegment'
import CMediatrice from '../objets/CMediatrice'
import CMilieu from '../objets/CMilieu'
import CSegment from '../objets/CSegment'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import CPointLieDroite from '../objets/CPointLieDroite'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'

export default OutilDtMed

/**
 * Outil servant à créer une médiatrice
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtMed (app) {
  OutilObjetPar2Pts.call(this, app, 'DtMed', 32790, true)
}

OutilDtMed.prototype = new OutilObjetPar2Pts()

OutilDtMed.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CMediatrice(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt1, pt2)
}

OutilDtMed.prototype.creeObjet = function () {
  const app = this.app
  const pasDejaCree = OutilObjetPar2Pts.prototype.creeObjet.call(this, !app.autoComplete)
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
  const med = list.get(len - 1) // a été rajouté à liste par OutilObjetPar2Pts.prototype.creeObjet
  let mil = new CMilieu(app.listePr, null, false, coul, false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, this.point1, this.point2)
  const milieuDejaCree = app.objetDejaCree(mil)
  if (milieuDejaCree) mil = milieuDejaCree
  else {
    list.add(mil)
    mil.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  }
  // On crée un point lié la médiatrice pour pouvoir créer une marque d'angle
  const ptlie = new CPointLieDroite(list, null, false, Color.black, false, 3, 0, true, '', app.getTaillePoliceNom(), MotifPoint.petitRond, false, false, 0.25, med)
  list.add(ptlie)
  ptlie.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  const marqAng = new CMarqueAngleGeometrique(list, null, false, coulRemp, false, StyleTrait.stfc(list), app.getStyleMarqueAngle(), 14, ptlie, mil, this.point1, false)
  list.add(marqAng)
  marqAng.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  if (!milieuDejaCree) {
    const seg1 = new CSegment(list, null, false, coul, true, app.getStyleTrait(), this.point1, mil)
    list.add(seg1)
    const seg2 = new CSegment(list, null, false, coul, true, app.getStyleTrait(), this.point2, mil)
    list.add(seg2)
    const styleTrait = new StyleTrait(list, StyleTrait.styleTraitContinu, 2)
    const marque1 = new CMarqueSegment(list, null, false, coul, false, styleTrait, app.getStyleMarqueSegment(), seg1)
    list.add(marque1)
    const marque2 = new CMarqueSegment(list, null, false, coul, false, styleTrait, app.getStyleMarqueSegment(), seg2)
    list.add(marque2)
    mil.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    seg1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    seg2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    marque1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    marque2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    // On reclasse la mdéiatrice pour qu'un éditeur de nom n'apparaisse pas pour le milieu créé
    list.reclasseVersFinAvecDependants(med, svg)
  }
  const seg = new CSegment(list, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2)
  if (!app.objetDejaCree(seg)) {
    list.add(seg)
    seg.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  }
  this.saveFig()
  this.reselect()
  return true
}

OutilDtMed.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const stfc = StyleTrait.stfc2(list)
  const mil = new CMilieu(list, null, false, b, true, 0, 0, true, '', 13, MotifPoint.petitRond, false, this.point1, app.mousePoint)
  app.ajouteObjetVisuel(mil)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point1, mil)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, mil, app.mousePoint)
  app.ajouteObjetVisuel(seg2)
  const mms = StyleMarqueSegment.marqueSimple
  const ms1 = new CMarqueSegment(list, null, false, b, false, stfc, mms, seg1)
  app.ajouteObjetVisuel(ms1)
  const ms2 = new CMarqueSegment(list, null, false, b, false, stfc, mms, seg2)
  app.ajouteObjetVisuel(ms2)
  // On crée une perpendiculaire plutôt qu'une médiatrice pour pouvoir lui adjoindre
  // une marque d'angle droit
  const dp = new CDroitePerpendiculaire(list, null, false, app.getCouleur(), true, 0, 0, false, '', 13, app.getStyleTrait(), 0.9, mil, seg1)
  app.ajouteObjetVisuel(dp)
  const coul = app.getCouleur()
  const coulRemp = app.autoComplete ? new Color(coul.red, coul.green, coul.blue, defaultSurfOpacity) : b
  const styleMarqueAngle = app.autoComplete ? app.getStyleMarqueAngle() : StyleMarqueAngle.marqueSimple
  const mad = new CMarqueAngleDroit(list, null, false, coulRemp, false, stfc, styleMarqueAngle, 13, dp)
  app.ajouteObjetVisuel(mad)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtMed.prototype.creationPointPossible = function () {
  return true
}

OutilDtMed.prototype.preIndication = function () {
  return 'DtMed'
}

OutilDtMed.prototype.isLineTool = function () {
  return true
}

// Si on est en mode complétion automatique on met aussi les styles de marques
// de segment dans la palette de droite quand cet outil est activé.
OutilDtMed.prototype.isSegmentMarkTool = function () {
  return this.app.autoComplete
}

OutilDtMed.prototype.isAngleTool = function () {
  return this.app.autoComplete
}
