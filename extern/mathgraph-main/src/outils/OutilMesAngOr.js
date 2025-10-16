/*
 * Created by yvesb on 04/01/2017.
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
import CMarqueAngleOriente from '../objets/CMarqueAngleOriente'
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
import CMesureAngleOriente from '../objets/CMesureAngleOriente'
import StyleTrait from '../types/StyleTrait'
import Color from '../types/Color'
import MotifFleche from '../types/StyleFleche'
import NomMesureDlg from '../dialogs/NomMesureDlg'
import CPointBase from '../objets/CPointBase'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
export default OutilMesAngOr
/**
 * Outil servant à créer une segment en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesAngOr (app) {
  OutilPar3Pts.call(this, app, 'MesAngOr', 32814, true)
  // this.tip = getStr("MesAngOr");
}

OutilMesAngOr.prototype = new OutilPar3Pts()

OutilMesAngOr.prototype.preIndication = function () {
  return 'MesAngOr'
}

OutilMesAngOr.prototype.creeObjet = function () {
  let nbEltsCrees, ind
  const app = this.app
  const li = app.listePr
  const leninit = li.longueur()
  const indiceImpInitial = li.longueur()
  if (li.uniteAngle === uniteAngleDegre && app.displayMeasures) {
    // On charge la construction qui est contenue dans this.app.docConst
    const proto = this.app.docCons.getPrototype('MesureAngleOriente')
    this.annuleClignotement()
    proto.get(0).elementAssocie = this.point1
    proto.get(1).elementAssocie = this.point2
    proto.get(2).elementAssocie = this.point3
    const impProto = new CImplementationProto(li, proto)
    impProto.implemente(this.app.dimf, proto)
    impProto.nomProto = getStr('MesAngOr')
    ind = li.longueur() - 1
    const aff = li.get(ind - 1) // L'affichage de la mesure
    const coul = app.getCouleur()
    aff.donneCouleur(coul)
    const marque = li.get(ind)
    // Il faut créer un deuxième objet couleur pour la marque
    const coul2 = app.getCouleur()
    coul2.opacity = defaultSurfOpacity
    marque.donneCouleur(coul2)
    marque.donneStyle(app.getStyleTrait())
    marque.donneStyleMarque(app.getStyleMarqueAngle())
    this.mes = li.get(ind - 2) // La mesure
    nbEltsCrees = ind + 1 - leninit
  } else {
    this.mes = new CMesureAngleOriente(li, null, false, this.point1, this.point2, this.point3, '')
    app.ajouteElement(this.mes)
    ind = li.longueur() - 1 // Corrigé version 6.2.0
    nbEltsCrees = 1
  }
  // On regarde si la longueur mesurée existe déjà
  const existeDeja = app.existeDeja(this.mes)
  if (existeDeja) {
    new AvertDlg(app, 'DejaCree')
    app.detruitDerniersElements(nbEltsCrees)
  } else {
    const self = this
    // Important : Quand on annule lors de l'entrée du nom  de la mesure, si on annule, callBackCancel est appelé,
    // this.creeObjet a déjà rendu la valeur true et this.deselect a déjà été appelé. Il faut donc mémoriser les
    // valeurs actuelles pour les passer en paramètre à la fonction de callBack d'annulation
    const infoAnnul = {
      indiceImpInitial,
      nbObjAjoutes: ind + 1 - leninit,
      pt1: this.point1,
      pt2: this.point2,
      pt3: this.point3,
      pt1Cree: this.point1Cree,
      pt2Cree: this.point2Cree,
      pt1Nomme: this.point1Nomme,
      pt2Nomme: this.point2Nomme,
      pt3Nomme: this.point3Nomme
    }
    new NomMesureDlg(app, getStr('MesAngOr') + ' (' + this.point2.nom + this.point1.nom + ',' + this.point2.nom + this.point3.nom + ')',
      function (st) { self.callBackAfterDlg(st, infoAnnul) },
      function () { self.callBackCancel(infoAnnul) })
  }
  return !existeDeja
}

OutilMesAngOr.prototype.callBackAfterDlg = function (st, infoAnnul) {
  const app = this.app
  const li = app.listePr
  this.mes.nomCalcul = st
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  li.afficheTout(infoAnnul.indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
}

OutilMesAngOr.prototype.callBackCancel = function (infoAnnul) {
  this.app.detruitDerniersElements(infoAnnul.nbObjAjoutes)
  this.objetCree = false // Pour que les points éventuellemnt nommés par l'outil soient dénommés.
  this.point1 = infoAnnul.pt1
  this.point2 = infoAnnul.pt2
  this.point3 = infoAnnul.pt3
  this.point1Cree = infoAnnul.pt1Cree
  this.point2Cree = infoAnnul.pt2Cree
  this.point1Nomme = infoAnnul.pt1Nomme
  this.point2Nomme = infoAnnul.pt2Nomme
  this.point3Nomme = infoAnnul.pt3Nomme
  this.deselect()
  this.select()
}

OutilMesAngOr.prototype.ajouteObjetsVisuels = function () {
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
    const proto = this.app.docCons.getPrototype('MesureAngleOriente')
    proto.get(0).elementAssocie = p1
    proto.get(1).elementAssocie = p2
    proto.get(2).elementAssocie = app.mousePoint
    const impProto = new CImplementationProto(li, proto)
    impProto.implemente(app.dimf, proto)
    const ind = li.longueur() - 1
    const aff = li.get(ind - 1) // L'affichage de la mesure
    aff.donneCouleur(coul)
    const marque = li.get(ind)
    coul.opacity = defaultSurfOpacity
    marque.donneCouleur(coul)
    marque.donneStyle(app.getStyleTrait())
    marque.donneStyleMarque(app.getStyleMarqueAngle())
    app.afficheObjetVisuels(nbObj) // Ajout version 6.4.4
  } else {
    const mar = new CMarqueAngleOriente(li, null, false, b, false, StyleTrait.stfc(),
      StyleMarqueAngle.marqueSimple, 35, this.point1, this.point2, app.mousePoint, MotifFleche.FlecheCourtePleine)
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

OutilMesAngOr.prototype.nomsPointsIndisp = function () {
  return true
}

OutilMesAngOr.prototype.isAngleTool = function () {
  return true
}

OutilMesAngOr.prototype.isLineTool = function () {
  return true
}
