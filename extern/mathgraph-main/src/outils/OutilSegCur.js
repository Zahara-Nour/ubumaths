/*
 * Created by yvesb on 11/02/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilPar2Pts from '../outils/OutilPar2Pts'
import CImplementationProto from '../objets/CImplementationProto'
import { getStr } from 'src/kernel/kernel'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CPointBase from '../objets/CPointBase'
import MotifPoint from '../types/MotifPoint'

export default OutilSegCur

/**
 * Outil servant à créer un segment curviligne (courbe de Bézier)
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSegCur (app) {
  OutilPar2Pts.call(this, app, 'SegCur', 33038, true)
}

OutilSegCur.prototype = new OutilPar2Pts()

OutilSegCur.prototype.creeObjet = function () {
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('SegmentCurviligne')
  this.annuleClignotement()
  proto.get(0).elementAssocie = this.point1
  proto.get(1).elementAssocie = this.point2
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(this.app.dimf, proto)
  impProto.nomProto = getStr('SegCur')
  const ind = li.longueur() - 1
  const lieu = li.get(ind) // Le lieu de points (courbe de Bézier)
  const coul = app.getCouleur()
  lieu.donneCouleur(coul)
  lieu.donneStyle(app.getStyleTrait())
  const pt = li.get(ind - 6) // Le point de contrôle
  pt.donneCouleur(coul)
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()
  this.nbPtsCrees = 0
  li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  return true
}

OutilSegCur.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const li = app.listeObjetsVisuels
  const b = Color.black
  const stfp = new StyleTrait(li, StyleTrait.styleTraitPointille, 1)
  // var pt1 = this.point1.getClone(app.listePr,li);
  const pt1 = new CPointBase(li, null, false, b, true, 0, 0, true, '', app.getTaillePoliceNom(),
    MotifPoint.pixel, false, false, this.point1.x, this.point1.y)
  // app.ajouteObjetVisuel(pt1);
  // app.ajouteObjetVisuel(app.mousePoint);
  // Pour les deux lignes suivantes on n'appelle pas ajouteObjetVisuel car les deux objets seront affichés plus tard
  app.listeObjetsVisuels.add(pt1)
  app.listeObjetsVisuels.add(app.mousePoint)
  const proto = app.docCons.getPrototype('SegmentCurviligne')
  proto.get(0).elementAssocie = pt1
  proto.get(1).elementAssocie = app.mousePoint
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(app.dimf, proto, 0)
  const ind = li.longueur() - 1
  const lieu = li.get(ind) // Le lieu de points (courbe de Bézier)
  lieu.donneStyle(stfp)
  app.afficheObjetVisuels(0)
}

OutilSegCur.prototype.isLineTool = function () {
  return true
}
