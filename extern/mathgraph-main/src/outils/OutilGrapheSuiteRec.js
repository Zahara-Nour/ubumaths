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
import CGrapheSuiteRec from '../objets/CGrapheSuiteRec'
import GrapheSuiteRecDlg from '../dialogs/GrapheSuiteRecDlg'
import NatCal from '../types/NatCal'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilGrapheSuiteRec

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilGrapheSuiteRec (app) {
  Outil.call(this, app, 'GrapheSuiteRec', 32882)
}
OutilGrapheSuiteRec.prototype = new Outil()

OutilGrapheSuiteRec.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  const app = this.app
  const list = app.listePr
  this.graphe = new CGrapheSuiteRec(list, null, false, app.getCouleur(), false, app.getStyleTrait(), null, null, true)
  new GrapheSuiteRecDlg(app, this.graphe, true, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
  this.app.activeOutilCapt()
}

OutilGrapheSuiteRec.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsCalcul(NatCal.NSuiteRecurrenteReelle) > 0)
}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilGrapheSuiteRec.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.graphe)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.graphe.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
    app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
}

OutilGrapheSuiteRec.prototype.isLineTool = function () {
  return true
}
