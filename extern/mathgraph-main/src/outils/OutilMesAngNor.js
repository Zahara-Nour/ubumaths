/*
 * Created by yvesb on 03/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { getStr, uniteAngleDegre } from '../kernel/kernel'
import OutilPar3Pts from './OutilPar3Pts'
import AvertDlg from '../dialogs/AvertDlg'
import CImplementationProto from '../objets/CImplementationProto'
import CMarqueAngleGeometrique from '../objets/CMarqueAngleGeometrique'
import Vect from '../types/Vect'
import CValeur from '../objets/CValeur'
import CPointParAbscisse from '../objets/CPointParAbscisse'
import MotifPoint from '../types/MotifPoint'
import CArcDeCercle from '../objets/CArcDeCercle'
import CBissectrice from '../objets/CBissectrice'
import CIntDroiteCercle from '../objets/CIntDroiteCercle'
import CPointLieBipoint from '../objets/CPointLieBipoint'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import CCommentaire from '../objets/CCommentaire'
import CMesureAngleGeometrique from '../objets/CMesureAngleGeometrique'
import CPointBase from '../objets/CPointBase'
import StyleTrait from '../types/StyleTrait'
import Color from '../types/Color'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'
import StyleMarqueAngle from '../types/StyleMarqueAngle'

export default OutilMesAngNor
/**
 * Outil servant à créer une segment en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesAngNor (app) {
  OutilPar3Pts.call(this, app, 'MesAngNor', 32816, true)
}

OutilMesAngNor.prototype = new OutilPar3Pts()

OutilMesAngNor.prototype.preIndication = function () {
  return 'MesAngNor'
}

OutilMesAngNor.prototype.creeObjet = function () {
  let mes, nbEltsCrees
  const app = this.app
  const li = app.listePr
  const leninit = li.longueur()
  const indiceImpInitial = li.longueur()
  if (li.uniteAngle === uniteAngleDegre && app.displayMeasures) {
    // On charge la construction qui est contenue dans this.app.docConst
    const proto = this.app.docCons.getPrototype('MesureAngle')
    this.annuleClignotement()
    proto.get(0).elementAssocie = this.point1
    proto.get(1).elementAssocie = this.point2
    proto.get(2).elementAssocie = this.point3
    const impProto = new CImplementationProto(li, proto)
    impProto.implemente(this.app.dimf, proto)
    impProto.nomProto = getStr('MesAngNor')
    const ind = li.longueur() - 1
    const aff = li.get(ind) // L'affichage de la mesure
    const coul = app.getCouleur()
    aff.donneCouleur(coul)
    const marque = li.get(ind - 1)
    // Il faut créer un deuxième objet couleur pour la marque
    const coul2 = app.getCouleur()
    coul2.opacity = defaultSurfOpacity
    marque.donneCouleur(coul2)
    marque.donneStyle(app.getStyleTrait())
    marque.donneStyleMarque(app.getStyleMarqueAngle())
    mes = li.get(ind - 2) // La longueur mesurée
    nbEltsCrees = ind + 1 - leninit
  } else {
    mes = new CMesureAngleGeometrique(li, null, false, this.point1, this.point2, this.point3)
    app.ajouteElement(mes)
    nbEltsCrees = 1
  }
  // On regarde si la longueur mesurée existe déjà
  const existeDeja = app.existeDeja(mes)
  if (existeDeja) {
    new AvertDlg(app, 'DejaCree')
    app.detruitDerniersElements(nbEltsCrees)
  } else {
    this.saveFig()
    // Corrigé version 5.6.4
    if (app.estExercice) app.listePourConst = app.listePourConstruction()

    li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  }
  return !existeDeja
}

OutilMesAngNor.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const li = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(li)
  const coul = app.getCouleur()
  const coulFond = app.doc.couleurFond
  // Color.BLACK, StyleTrait.traitFin,
  // point1, point2, pane.pointSouris, 2);
  if (app.listePr.uniteAngle === uniteAngleDegre) {
    const nbObj = li.longueur()
    const p1 = new CPointBase(li, null, false, b, true, 0, 0, true, '', 13, MotifPoint.pixel,
      false, false, this.point1.x, this.point1.y)
    // Pour les deux lignes suivantes on n'appelle pas ajouteObjetVisuel car les deux objets seront affichés plus tard
    li.add(p1)
    const p2 = new CPointBase(li, null, false, b, true, 0, 0, true, '', 13, MotifPoint.pixel,
      false, false, this.point2.x, this.point2.y)
    // Pour les deux lignes suivantes on n'appelle pas ajouteObjetVisuel car les deux objets seront affichés plus tard
    li.add(p2)
    li.add(app.mousePoint)
    // li.afficheTout(nbObj, app.svgFigure, true, app.doc.couleurFond, app.doc.opacity)
    // On charge la construction qui est contenue dans this.app.docConst
    const proto = this.app.docCons.getPrototype('MesureAngle')
    proto.get(0).elementAssocie = p1
    proto.get(1).elementAssocie = p2
    proto.get(2).elementAssocie = app.mousePoint
    const impProto = new CImplementationProto(li, proto)
    impProto.implemente(app.dimf, proto)
    const ind = li.longueur() - 1
    const aff = li.get(ind) // L'affichage de la mesure
    aff.donneCouleur(coul)
    const marque = li.get(ind - 1)
    coul.opacity = defaultSurfOpacity
    marque.donneCouleur(coul)
    marque.donneStyle(app.getStyleTrait())
    marque.donneStyleMarque(app.getStyleMarqueAngle())
    app.afficheObjetVisuels(nbObj) // Ajout version 6.4.4
  } else {
    const mar = new CMarqueAngleGeometrique(li, null, false, b, false, StyleTrait.stfc(),
      StyleMarqueAngle.marqueSimple, 35, this.point1, this.point2, app.mousePoint)
    app.ajouteObjetVisuel(mar)
    const vec = new Vect(this.point2, this.point1)
    const d = 17 / vec.norme()
    const ab = new CValeur(li, d)
    const pt1 = new CPointParAbscisse(li, null, false, b, true, 0, 0, true, '', 16, MotifPoint.petitRond, false,
      this.point2, this.point1, ab)
    app.ajouteObjetVisuel(pt1)
    // On crée un petit arc de cercle de centre point2, commençant par point 1
    // et dirigé vers le pointeur souris
    const arc = new CArcDeCercle(li, null, false, b, true, stfp, this.point2, pt1, app.mousePoint, null)
    app.ajouteObjetVisuel(arc)
    // On crée une bissectrice
    const bis = new CBissectrice(li, null, false, b, true, 0, 0, true, '', 16, stfp, 1, this.point1, this.point2,
      app.mousePoint)
    app.ajouteObjetVisuel(bis)
    // On crée l'intersection de l'arc et de la bissectrice
    const inter = new CIntDroiteCercle(li, null, false, bis, arc)
    app.ajouteObjetVisuel(inter)
    const ptl1 = new CPointLieBipoint(li, null, false, b, true, 0, 0, true, '', 16, MotifPoint.petitRond, false, inter, 1)
    app.ajouteObjetVisuel(ptl1)
    const ptl2 = new CPointLieBipoint(li, null, false, b, true, 0, 0, true, '', 16, MotifPoint.petitRond, false, inter, 2)
    app.ajouteObjetVisuel(ptl2)
    const com1 = new CCommentaire(li, null, false, b, 0, 0, 0, 0, false, ptl1, 17, StyleEncadrement.Sans, false,
      coulFond, CAffLiePt.alignHorCent, CAffLiePt.alignVerCent, '?')
    app.ajouteObjetVisuel(com1)
    const com2 = new CCommentaire(li, null, false, b, 0, 0, 0, 0, false, ptl2, 17, StyleEncadrement.Sans, false,
      coulFond, CAffLiePt.alignHorCent, CAffLiePt.alignVerCent, '?')
    app.ajouteObjetVisuel(com2)
    app.afficheObjetVisuels(0) // Ajout version 6.4.4
  }
}

OutilMesAngNor.prototype.nomsPointsIndisp = function () {
  return true
}

OutilMesAngNor.prototype.isAngleTool = function () {
  return true
}

OutilMesAngNor.prototype.isLineTool = function () {
  return true
}
