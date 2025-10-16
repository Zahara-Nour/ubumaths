/*
 * Created by yvesb on 13/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import Outil from '../outils/Outil'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilLieuParPtLieAncetre

/**
 * Outil ancêtre des outils servant à créer un lieu de points généré par un point lié (relié ou discret)
 * Les outils descendants doivent avoir une fonction creeObjet()
 * @param {MtgApp} app L'application propriétaire
 * @param id L'id de l'outil
 * @param toolIndex L'index de l'outil
 * @constructor
 */
function OutilLieuParPtLieAncetre (app, id, toolIndex) {
  // Outil.call(this, app, "LieuParPtLie", 32819, true);
  Outil.call(this, app, id, toolIndex, true)
}

OutilLieuParPtLieAncetre.prototype = new Outil()
OutilLieuParPtLieAncetre.prototype.constructor = OutilLieuParPtLieAncetre

OutilLieuParPtLieAncetre.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.pointPourTrace = null
  this.pointLieGenerateur = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indLieu1', this.preIndication())
}

OutilLieuParPtLieAncetre.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  if (this.pointPourTrace === null) {
    this.pointPourTrace = elg
    // On n'exclut pas pointPourTrace d'une désignation possible car le point lié peut être égal
    // au point générateur du lieu
    this.ajouteClignotementDe(elg)
    // frame.indication(getStr("lieuParPointLie2"));
    app.listeClignotante.ajoutePointsLiesVisiblesDontDepend(list, elg)
    app.outilPointageActif = app.outilPointageObjetClignotant
    app.outilPointageActif.aDesigner = NatObj.NPointLie
    app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
    this.resetClignotement()
    app.indication('indLieu2', this.preIndication())
  } else {
    if (this.pointLieGenerateur === null) {
      this.pointLieGenerateur = elg
      this.creeObjet()
    }
  }
}

OutilLieuParPtLieAncetre.prototype.actionApresDlgOK = function () {
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

OutilLieuParPtLieAncetre.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilLieuParPtLieAncetre.prototype.isPointTool = function () {
  return true
}

OutilLieuParPtLieAncetre.prototype.isLineTool = function () {
  return true
}
