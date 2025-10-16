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
import CLieuObjetParPtLie from '../objets/CLieuObjetParPtLie'
import LieuObjetDlg from '../dialogs/LieuObjetDlg'
import CValeur from '../objets/CValeur'
import AvertDlg from '../dialogs/AvertDlg'
import addQueue from 'src/kernel/addQueue'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
export default OutilLieuObjetParPtLie

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilLieuObjetParPtLie (app) {
  Outil.call(this, app, 'LieuObjetParPtLie', 33122, true)
}

OutilLieuObjetParPtLie.prototype = new Outil()

OutilLieuObjetParPtLie.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.objetPourTrace = null
  this.pointLieGenerateur = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = Nat.or(NatObj.NTtObjPourLieu, NatObj.NSurface, NatObj.NImage)
  // On interdit de désigner une surface qui ne peut pas être un lieu d'objets
  const listePr = app.listePr
  const li = app.listeExclusion
  for (let i = 0; i < listePr.longueur(); i++) {
    const elb = listePr.get(i)
    if (elb.estDeNature(NatObj.NSurface) && !elb.peutGenererLieuObjet()) li.add(elb)
  }
  app.outilPointageCre.reset()
  app.indication('indLieuObj1', 'LieuObjetParPtLie')
}

OutilLieuObjetParPtLie.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  if (this.objetPourTrace === null) {
    this.objetPourTrace = elg
    // On n'exclut pas objetPourTrace d'une désignation possible car le point lié peut être égal
    // au point générateur du lieu
    this.ajouteClignotementDe(elg)
    // frame.indication(getStr("lieuParPointLie2"));
    app.listeClignotante.ajoutePointsLiesVisiblesDontDepend(list, elg)
    app.outilPointageActif = app.outilPointageObjetClignotant
    app.outilPointageActif.aDesigner = NatObj.NPointLie
    app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigné un objet clignotant
    this.resetClignotement()
    app.indication('indLieu2', 'LieuObjetParPtLie')
  } else {
    if (this.pointLieGenerateur === null) {
      this.pointLieGenerateur = elg
      this.creeObjet()
    }
  }
}

OutilLieuObjetParPtLie.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.ajouteElement(this.lieu)
  if (app.verifieDernierElement(1)) {
    const self = this
    // Le lieu créé existe bien et n'a pas été déjà créé
    // Il faut appeler setReady4MathJax car le lieu peut être un lieu d'affichage LaTeX
    this.lieu.setReady4MathJax()
    // Modification version 6.4 : Il faut passer par la pile d'appels au cas où le texte à afficher commmence et finit par un $
    addQueue(function () {
      self.lieu.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    })

    this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt()
}

OutilLieuObjetParPtLie.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  const nbTraces = new CValeur(list, 40)
  const coul = app.getCouleur()
  if (this.objetPourTrace.estDeNature(NatObj.NSurface)) coul.opacity = defaultSurfOpacity // Pour les éventuels lieux d'objets de surfaces
  this.lieu = new CLieuObjetParPtLie(list, null, false, coul, false, this.objetPourTrace, nbTraces, this.pointLieGenerateur)
  new LieuObjetDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuObjetParPtLie.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilLieuObjetParPtLie.prototype.isPointTool = function () {
  return true
}

OutilLieuObjetParPtLie.prototype.isLineTool = function () {
  return true
}
