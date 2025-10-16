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
import StyleTrait from '../types/StyleTrait'
import CMarqueSegment from '../objets/CMarqueSegment'
import CMilieu from '../objets/CMilieu'
import CSegment from '../objets/CSegment'
import OutilObjetPar2Pts from './OutilObjetPar2Pts'
export default OutilMilieu
/**
 * Outil servant à créer une droite définie par deux points
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMilieu (app) {
  OutilObjetPar2Pts.call(this, app, 'Milieu', 32781, true)
}

OutilMilieu.prototype = new OutilObjetPar2Pts()

OutilMilieu.prototype.preIndication = function () {
  return 'Milieu'
}

OutilMilieu.prototype.objet = function (pt1, pt2) {
  const app = this.app
  return new CMilieu(app.listePr, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, pt1, pt2)
}

OutilMilieu.prototype.creeObjet = function () {
  const app = this.app
  const pasDejaCree = OutilObjetPar2Pts.prototype.creeObjet.call(this, !app.autoComplete)
  if (!pasDejaCree) return false
  if (!app.autoComplete) return true
  // Si app.autoComplete est à true et si la perpendiculaire n'a pas été déjà créé, on rajoute une marque
  // d'angle perpendiculaire
  const list = app.listePr
  const len = list.longueur()
  const mil = list.get(len - 1) // a été rajouté à liste par OutilParDtPt.prototype.creeObjet
  // En mode autoComplete on rajoute deux segments joignant les extrémités au milieu et on leur affecte une marque de segment
  const seg1 = new CSegment(list, null, false, app.getCouleur(), true, app.getStyleTrait(), this.point1, mil)
  list.add(seg1)
  const seg2 = new CSegment(list, null, false, app.getCouleur(), true, app.getStyleTrait(), this.point2, mil)
  list.add(seg2)
  const styleTrait = new StyleTrait(list, StyleTrait.styleTraitContinu, 2)
  const marque1 = new CMarqueSegment(list, null, false, app.getCouleur(), false, styleTrait, app.getStyleMarqueSegment(), seg1)
  list.add(marque1)
  const marque2 = new CMarqueSegment(list, null, false, app.getCouleur(), false, styleTrait, app.getStyleMarqueSegment(), seg2)
  list.add(marque2)
  const dimf = app.dimf
  const svg = app.svgFigure
  const coulfond = app.doc.couleurFond
  seg1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  seg2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  marque1.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  marque2.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  const seg = new CSegment(list, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2)
  if (!app.objetDejaCree(seg)) {
    list.add(seg)
    seg.positionneEtCreeAffichage(false, dimf, svg, coulfond)
  }
  this.saveFig()
  this.reselect()
  return true
}

OutilMilieu.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = app.autoComplete ? app.getCouleur() : Color.black
  const stfp = app.autoComplete ? app.getStyleTrait() : StyleTrait.stfp(list)
  const stfc = StyleTrait.stfc2(list)
  const mms = app.autoComplete ? app.getStyleMarqueSegment() : StyleMarqueSegment.marqueSimple
  const mil = this.objet(this.point1, app.mousePoint)
  app.ajouteObjetVisuel(mil)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point1, mil)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, mil, app.mousePoint)
  app.ajouteObjetVisuel(seg2)
  const ms1 = new CMarqueSegment(list, null, false, b, false, stfc, mms, seg1)
  app.ajouteObjetVisuel(ms1)
  const ms2 = new CMarqueSegment(list, null, false, b, false, stfc, mms, seg2)
  app.ajouteObjetVisuel(ms2)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilMilieu.prototype.isPointTool = function () {
  return true
}

// Si on est en mode complétion automatique on met aussi les styles de marques
// de segment dans la palette de droite quand cet outil est activé.
OutilMilieu.prototype.isSegmentMarkTool = function () {
  return this.app.autoComplete
}

OutilMilieu.prototype.isLineTool = function () {
  return this.app.autoComplete
}
