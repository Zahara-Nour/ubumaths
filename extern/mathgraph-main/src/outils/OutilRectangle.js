/*
 * Created by yvesb on 28/09/2016.
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
import CImplementationProto from '../objets/CImplementationProto'
import CSegment from '../objets/CSegment'
import OutilPar2Pts from './OutilPar2Pts'
import CPointBase from '../objets/CPointBase'
import { getStr } from '../kernel/kernel'
export default OutilRectangle
/**
 * Outil servant à créer rectangle en cliquant sur deux points, le premier point rajouté étant un point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRectangle (app) {
  OutilPar2Pts.call(this, app, 'Rectangle', 32998, true)
}

OutilRectangle.prototype = new OutilPar2Pts()

OutilRectangle.prototype.creeObjet = function () {
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('Rectangle')
  this.annuleClignotement()
  proto.get(0).elementAssocie = this.point1
  proto.get(1).elementAssocie = this.point2
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(this.app.dimf, proto)
  impProto.nomProto = getStr('Rectangle')
  const ind = li.longueur() - 1
  const pt3 = li.get(ind - 2)
  pt3.donneCouleur(app.getCouleur())
  pt3.donneMotif(app.getStylePoint())
  const pt4 = li.get(ind)
  pt4.donneCouleur(app.getCouleur())
  pt4.donneMotif(app.getStylePoint())
  app.addSegment(this.point1, this.point2)
  app.addSegment(this.point2, pt3)
  app.addSegment(pt3, pt4)
  app.addSegment(pt4, this.point1)
  app.addPolygon(this.point1, this.point2, pt3, pt4, this.point1)
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  this.nbPtsCrees = 0
  li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  return true
}

OutilRectangle.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const li = app.listeObjetsVisuels
  const b = Color.black
  const stfp = new StyleTrait(li, StyleTrait.styleTraitPointille, 1)
  const pt1 = new CPointBase(li, null, false, b, true, 0, 0, true, '', app.getTaillePoliceNom(),
    MotifPoint.pixel, false, false, this.point1.x, this.point1.y)
  // Pour les deux lignes suivantes on n'appelle pas ajouteObjetVisuel car les deux objets seront affichés plus tard
  app.listeObjetsVisuels.add(pt1)
  app.listeObjetsVisuels.add(app.mousePoint)
  const proto = app.docCons.getPrototype('Rectangle')
  proto.get(0).elementAssocie = pt1
  proto.get(1).elementAssocie = app.mousePoint
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(app.dimf, proto, 0)
  impProto.nomProto = getStr('Rectangle')
  const ind = li.longueur() - 1
  // ON récupère les points créés par la construction
  const pt3 = li.get(ind - 2)
  const pt4 = li.get(ind)
  const seg1 = new CSegment(li, null, false, b, false, stfp, pt1, app.mousePoint)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(li, null, false, b, false, stfp, app.mousePoint, pt3)
  app.ajouteObjetVisuel(seg2)
  const seg3 = new CSegment(li, null, false, b, false, stfp, pt3, pt4)
  app.ajouteObjetVisuel(seg3)
  const seg4 = new CSegment(li, null, false, b, false, stfp, pt4, pt1)
  app.ajouteObjetVisuel(seg4)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilRectangle.prototype.creationPointPossible = function () {
  return true
}

OutilRectangle.prototype.isPointTool = function () {
  return true
}

OutilRectangle.prototype.isLineTool = function () {
  return true
}
