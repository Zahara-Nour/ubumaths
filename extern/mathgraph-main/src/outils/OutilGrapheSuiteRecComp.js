/*
 * Created by yvesb on 15/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CGrapheSuiteRecComp from '../objets/CGrapheSuiteRecComplexe'
import GrapheSuiteRecDlg from '../dialogs/GrapheSuiteRecDlg'
import NatCal from '../types/NatCal'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilGrapheSuiteRecComp

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilGrapheSuiteRecComp (app) {
  Outil.call(this, app, 'GrapheSuiteRecComp', 33145)
}
OutilGrapheSuiteRecComp.prototype = new Outil()

OutilGrapheSuiteRecComp.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  const app = this.app
  const list = app.listePr
  // this.graphe = new CGrapheSuiteRecComp(list, null, false, app.getCouleur(), false, app.getStyleTrait(), null, null, true);
  this.graphe = new CGrapheSuiteRecComp(list, null, false, app.getCouleur(), false, app.getStyleTrait(), null, null, app.getStylePoint(), true)
  new GrapheSuiteRecDlg(app, this.graphe, false, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
  this.app.activeOutilCapt()
}

OutilGrapheSuiteRecComp.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsCalcul(NatCal.NSuiteRecurrenteComplexe) > 0)
}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilGrapheSuiteRecComp.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.graphe)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.graphe.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
    app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
}

OutilGrapheSuiteRecComp.prototype.isPointTool = function () {
  return true
}

OutilGrapheSuiteRecComp.prototype.isLineTool = function () {
  return true
}
