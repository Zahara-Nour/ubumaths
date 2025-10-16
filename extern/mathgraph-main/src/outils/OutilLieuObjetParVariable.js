/*
 * Created by yvesb on 07/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import Outil from '../outils/Outil'
import Nat from '../types/Nat'
import CLieuObjetParVariable from '../objets/CLieuObjetParVariable'
import ChoixVariableDlg from '../dialogs/ChoixVariableDlg'
import LieuObjetDlg from '../dialogs/LieuObjetDlg'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'
import AvertDlg from '../dialogs/AvertDlg'
import addQueue from 'src/kernel/addQueue'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
export default OutilLieuObjetParVariable

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilLieuObjetParVariable (app) {
  Outil.call(this, app, 'LieuObjetParVariable', 33124, true)
}

OutilLieuObjetParVariable.prototype = new Outil()

OutilLieuObjetParVariable.prototype.select = function () {
  this.objetPourTrace = null
  const self = this
  Outil.prototype.select.call(this)
  new ChoixVariableDlg(this.app, function (va) { self.actionApresDlg(va) }, function () { self.app.activeOutilCapt() })
}

OutilLieuObjetParVariable.prototype.actionApresDlg = function (va) {
  const app = this.app
  app.indication('indLieuObj1', 'LieuObjetParVariable')
  this.va = va // La variable choisie dans la boîte de dialogue
  const nat = Nat.or(NatObj.NTtObjPourLieu, NatObj.NSurface, NatObj.NImage)
  app.listeClignotante.ajouteObjetsParNatureDependantDe(app.listePr, nat, va, true)
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = nat
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigné un objet clignotant
  this.resetClignotement()
}

OutilLieuObjetParVariable.prototype.traiteObjetDesigne = function (elg) {
  if (this.objetPourTrace === null) {
    this.objetPourTrace = elg
    this.creeObjet() // Défini dans les outils descendants
  }
}

OutilLieuObjetParVariable.prototype.actionApresDlgOK = function (va) {
  this.va = va
  const app = this.app
  app.ajouteElement(this.lieu)
  if (app.verifieDernierElement(1)) {
    // Le lieu créé existe bien et n'a pas été déjà créé
    this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
    // Il faut appeler setReady4MathJax car le lieu peut être un lieu d'affichage LaTeX
    const lieu = this.lieu
    lieu.setReady4MathJax()
    addQueue(function () {
      lieu.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    })
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt()
}

OutilLieuObjetParVariable.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  const nbTraces = new CValeur(list, 40)
  const coul = app.getCouleur()
  if (this.objetPourTrace.estDeNature(NatObj.NSurface)) coul.opacity = defaultSurfOpacity // Pour les éventuels lieux d'objets de surfaces
  this.lieu = new CLieuObjetParVariable(list, null, false, coul, false, this.objetPourTrace, nbTraces, this.va)
  new LieuObjetDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuObjetParVariable.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilLieuObjetParVariable.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NVariable) !== 0
}

OutilLieuObjetParVariable.prototype.isPointTool = function () {
  return true
}

OutilLieuObjetParVariable.prototype.isLineTool = function () {
  return true
}
