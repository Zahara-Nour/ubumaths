/*
 * Created by yvesb on 05/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CPointParMultVect from '../objets/CPointParMultVect'
import PtParMultVecDlg from '../dialogs/PtParMultVecDlg'
import NatObj from '../types/NatObj'
import CVecteur from '../objets/CVecteur'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import Color from '../types/Color'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilPtParMultVec

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilPtParMultVec (app) {
  Outil.call(this, app, 'PtParMultVec', 32891, true, true, false, true)
}
OutilPtParMultVec.prototype = new Outil()

OutilPtParMultVec.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.vect = null // Le vecteur utilisé
  const app = this.app
  const list = app.listePr
  const self = this
  this.pt = new CPointParMultVect(list, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, null, null, null)
  new PtParMultVecDlg(app, this.pt, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilPtParMultVec.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  this.annuleClignotement()
  this.vect = null
  this.pt = null
}

OutilPtParMultVec.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NVecteur
  app.outilPointageCre.reset()
  app.indication('indVect', 'PtParMultVec')
}

OutilPtParMultVec.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (this.vect === null) {
    this.vect = elg
    app.outilPointageActif.aDesigner = NatObj.NTtPoint
    app.outilPointageActif.reset()
    this.ajouteClignotementDe(elg)
    this.resetClignotement()
    app.indication('indPt', 'PtParMultVec')
    this.ajouteObjetsVisuels()
  } else {
    this.creeObjet(elg)
  }
}

OutilPtParMultVec.prototype.creeObjet = function (point) {
  const app = this.app
  const list = app.listePr
  const coef = this.pt.coef // A été changé par la boîte de dialogue
  this.pt.antecedent = point
  this.pt.vect = this.vect
  app.ajouteElement(this.pt)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig(false)
    // app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
  // On recrée le point pour une éventuelle autre image avec le coefficient déjà choisi
  this.pt = new CPointParMultVect(list, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, null, null, coef)
}

OutilPtParMultVec.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const stfp = StyleTrait.stfp(list)
  const pt = new CPointParMultVect(list, null, false, Color.black, true, 0, 0, true, '', 13, 0, false, app.mousePoint,
    this.vect, this.pt.coef)
  app.ajouteObjetVisuel(pt)
  const vect = new CVecteur(list, null, false, Color.black, false, stfp, app.mousePoint, pt, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vect)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilPtParMultVec.prototype.activationValide = function () {
  return (this.app.listePr.nombreObjetsParNatureVisibles(NatObj.NVecteur) !== 0)
}

OutilPtParMultVec.prototype.isPointTool = function () {
  return true
}
