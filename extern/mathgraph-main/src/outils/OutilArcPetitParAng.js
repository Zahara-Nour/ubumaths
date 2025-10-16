/*
 * Created by yvesb on 10/01/2017.
 */
/**
 * Outil servant à créer un petie arc de cercle en cliquant sur deux points
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
import OutilPar2Pts from '../outils/OutilPar2Pts'
import CValeurAngle from '../objets/CValeurAngle'
import CArcDeCercle from '../objets/CArcDeCercle'
import AngleArcDlg from '../dialogs/AngleArcDlg'
import CConstante from '../objets/CConstante'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilArcPetitParAng

/**
 *
 * @param {MtgApp} app
 * @param toolName
 * @param toolIndex
 * @param avecClig
 * @constructor
 * @extends OutilPar2Pts
 */
function OutilArcPetitParAng (app, toolName, toolIndex, avecClig) {
  if (arguments.length === 1) OutilPar2Pts.call(this, app, 'ArcPetitParAng', 32798, true, false)
  else OutilPar2Pts.call(this, app, toolName, toolIndex, avecClig, false)
}

OutilArcPetitParAng.prototype = new OutilPar2Pts()
OutilArcPetitParAng.prototype.constructor = OutilArcPetitParAng

OutilArcPetitParAng.prototype.creeObjet = function () {
  const app = this.app
  const self = this
  // if (app.lastDlgId() === "angleArcDlg") return;
  const li = app.listePr
  const ang = new CValeurAngle(li, new CConstante(li, 1))
  this.arc = new CArcDeCercle(li, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2, null, ang)
  new AngleArcDlg(this.app, this.arc, false, function () { self.actionApresDlgOK() }, function () { self.reselect() })
}

OutilArcPetitParAng.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indCentre'
    case 2 : return 'debArc'
  }
}

OutilArcPetitParAng.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.ajouteElement(this.arc)
  if (app.verifieDernierElement(1)) {
    this.nbPtsCrees = 0
    // Le cercle créé existe bien et n'a pas été déjà créé
    this.arc.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
    this.saveFig()
    this.reselect()
  } else {
    new AvertDlg(app, 'DejaCree')
    this.reselect()
  }
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilArcPetitParAng.prototype.creationPointPossible = function () {
  return true
}

OutilArcPetitParAng.prototype.preIndication = function () {
  return 'ArcPetitParAng'
}

OutilArcPetitParAng.prototype.isLineTool = function () {
  return true
}
