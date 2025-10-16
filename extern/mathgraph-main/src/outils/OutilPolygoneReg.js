/*
 * Created by yvesb on 29/04/2017.
 */
/**
 * Outil servant à créer un point défini par son abscisse relativement à deux autres
 * Si les points ne sont pas nommés, un nom leur sera attribué
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
import OutilPar2Pts from '../outils/OutilPar2Pts'
import PolygoneRegDlg from '../dialogs/PolygoneRegDlg'
import { uniteAngleDegre } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import Pointeur from '../types/Pointeur'
import CConstante from '../objets/CConstante'
import COp from '../objets/COperation'
import Ope from '../types/Ope'
import CRotation from '../objets/CRotation'
import CPointImage from '../objets/CPointImage'
import CValeurAngle from '../objets/CValeurAngle'
import CNoeudPointeurSurPoint from '../objets/CNoeudPointeurSurPoint'
import CPolygone from '../objets/CPolygone'
import CalcR from '../kernel/CalcR'

export default OutilPolygoneReg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilPolygoneReg (app) {
  OutilPar2Pts.call(this, app, 'PolygoneReg', 32992, true, false)
}

OutilPolygoneReg.prototype = new OutilPar2Pts()

OutilPolygoneReg.prototype.select = function () {
  const app = this.app
  const self = this
  OutilPar2Pts.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.nbSommets = new Pointeur(0) // Renverra un pointeur vers le nombre de sommets du polygone
  new PolygoneRegDlg(this.app, this.nbSommets, function () {
    self.app.indication('indCentre', 'PolygoneReg')
  }, function () { self.app.activeOutilCapt() })
}

OutilPolygoneReg.prototype.creeObjet = function () {
  const colPoints = []
  const app = this.app
  const coul = app.getCouleur()
  const coulFond = app.doc.couleurFond
  const list = app.listePr
  const degre = list.uniteAngle === uniteAngleDegre
  const calc = new COp(list, degre ? new CConstante(list, 360) : CalcR.ccb('2*pi', list, 0, 4, null)
    , new CConstante(list, this.nbSommets.getValue()), Ope.Divi)
  const val = new CValeurAngle(list, calc)
  const rot = new CRotation(list, null, false, this.point1, val)
  let pt = this.point2
  app.ajouteElement(rot)
  colPoints.push(new CNoeudPointeurSurPoint(list, pt))
  for (let i = 1; i < this.nbSommets.getValue(); i++) {
    const ptim = new CPointImage(list, null, false, coul, false, 3, 0, false, '', app.getTaillePoliceNom(),
      app.getStylePoint(), false, pt, rot)
    app.ajouteElement(ptim, false)
    ptim.creeAffichage(app.svgFigure, false, coulFond)
    pt = ptim
    const noeud = new CNoeudPointeurSurPoint(list, pt)
    colPoints.push(noeud)
  }
  // On ferme le polygone
  colPoints.push(new CNoeudPointeurSurPoint(list, this.point2))
  const poly = new CPolygone(list, null, false, app.getCouleur(), false, app.getStyleTrait(), colPoints)
  app.ajouteElement(poly)
  poly.creeAffichage(app.svgFigure, false, coulFond)
  this.annuleClignotement()
  this.saveFig()
  app.activeOutilCapt()
}

OutilPolygoneReg.prototype.indication = function (ind) {
  switch (ind) {
    case 1 :
      return 'indCentre'
    case 2 :
      return 'indPolReg'
  }
}

OutilPolygoneReg.prototype.ajouteObjetsVisuels = function () {
  const colPoints = []
  const app = this.app
  const coul = app.getCouleur()
  const list = app.listePr
  const degre = list.uniteAngle === uniteAngleDegre
  const calc = new COp(list, degre ? new CConstante(list, 360) : CalcR.ccb('2*pi', list, 0, 4, null)
    , new CConstante(list, this.nbSommets.getValue()), Ope.Divi)
  const val = new CValeurAngle(list, calc)
  const rot = new CRotation(list, null, false, this.point1, val)
  app.ajouteObjetVisuel(rot)
  let pt = app.mousePoint
  colPoints.push(new CNoeudPointeurSurPoint(list, pt))
  for (let i = 1; i < this.nbSommets.getValue(); i++) {
    const ptim = new CPointImage(list, null, false, coul, false, 3, 0, false, '', 16, app.getStylePoint(), false, pt, rot)
    app.ajouteObjetVisuel(ptim)
    pt = ptim
    const noeud = new CNoeudPointeurSurPoint(list, pt)
    colPoints.push(noeud)
  }
  // On ferme le polygone
  colPoints.push(new CNoeudPointeurSurPoint(list, app.mousePoint))
  const poly = new CPolygone(list, null, false, app.getCouleur(), false, app.getStyleTrait(), colPoints)
  app.ajouteObjetVisuel(poly)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilPolygoneReg.prototype.preIndication = function () {
  return 'PolygoneReg'
}

OutilPolygoneReg.prototype.isPointTool = function () {
  return true
}

OutilPolygoneReg.prototype.isLineTool = function () {
  return true
}
