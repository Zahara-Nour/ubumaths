/*
 * Created by yvesb on 24/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CDroiteParEq from '../objets/CDroiteParEq'
import EqDroiteDlg from '../dialogs/EqDroiteDlg'
import NatCal from '../types/NatCal'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilDtParEq

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilDtParEq (app) {
  Outil.call(this, app, 'DtParEq', 32016)
}
OutilDtParEq.prototype = new Outil()

OutilDtParEq.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const self = this
  this.dt = new CDroiteParEq(list, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, list.premierRepVis(), null, null)
  new EqDroiteDlg(this.app, this.dt, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
  app.activeOutilCapt()
}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilDtParEq.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.dt)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.dt.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement()
    this.saveFig()
    app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
}

OutilDtParEq.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilDtParEq.prototype.isLineTool = function () {
  return true
}
