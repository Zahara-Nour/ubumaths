/*
 * Created by yvesb on 06/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Outil from '../outils/Outil'
import ChoixVariableDlg from '../dialogs/ChoixVariableDlg'
import AvertDlg from '../dialogs/AvertDlg'
import OutilLieuParPtLieAncetre from './OutilLieuParPtLieAncetre'
export default OutilLieuParVariableAncetre

/**
 * Outil ancêtre des outils servant à créer un lieu de points généré par une variable (relié ou discret)
 * Les outils descendants doivent avoir une fonction creeObjet()
 * @param {MtgApp} app L'application propriétaire
 * @param id L'id de l'outil
 * @param toolIndex L'index de l'outil
 * @constructor
 * @extends Outil
 */
function OutilLieuParVariableAncetre (app, id, toolIndex) {
  // Outil.call(this, app, "LieuParPtLie", 32819, true);
  Outil.call(this, app, id, toolIndex, true)
}

OutilLieuParVariableAncetre.prototype = new Outil()
OutilLieuParVariableAncetre.prototype.constructor = OutilLieuParVariableAncetre

OutilLieuParVariableAncetre.prototype.select = function () {
  this.pointPourTrace = null
  const self = this
  Outil.prototype.select.call(this)
  new ChoixVariableDlg(this.app, function (va) { self.actionApresDlg(va) }, function () { self.app.activeOutilCapt() })
}

OutilLieuParVariableAncetre.prototype.actionApresDlg = function (va) {
  const app = this.app
  app.indication('indLieu1', this.preIndication())
  this.va = va // La variable choisie dans la boîte de dialogue
  app.listeClignotante.ajouteObjetsParNatureDependantDe(app.listePr, NatObj.NTtPoint, va, true)
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigné un objet clignotant
  this.resetClignotement()
}

OutilLieuParVariableAncetre.prototype.traiteObjetDesigne = function (elg) {
  if (this.pointPourTrace === null) {
    this.pointPourTrace = elg
    this.creeObjet() // Défini dans les outils descendants
  }
}

OutilLieuParVariableAncetre.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.ajouteElement(this.lieu)
  if (app.verifieDernierElement(1)) {
    // Le lieu créé existe bien et n'a pas été déjà créé
    this.lieu.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt()
}

OutilLieuParVariableAncetre.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilLieuParVariableAncetre.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NVariable) !== 0
}

OutilLieuParPtLieAncetre.prototype.isPointTool = function () {
  return true
}

OutilLieuParPtLieAncetre.prototype.isLineTool = function () {
  return true
}
