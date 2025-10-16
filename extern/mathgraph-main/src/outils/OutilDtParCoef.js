/*
 * Created by yvesb on 21/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CDroiteOm from '../objets/CDroiteOm'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import CoefDirDlg from '../dialogs/CoefDirDlg'
import CValeur from '../objets/CValeur'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilDtParCoef
/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtParCoef (app) {
  OutilObjetPar1Objet.call(this, app, 'DtParCoef', 32869, true, NatObj.NTtPoint)
}

OutilDtParCoef.prototype = new OutilObjetPar1Objet()

OutilDtParCoef.prototype.indication = function () {
  return 'indPt'
}

/*
OutilDtParCoef.prototype.objet = function(pt) {
  var app = this.app;
  return new CDroiteOm(app.listePr, null,false, app.getCouleur(), false, 0, 0, false, "", 16, app.getStyleTrait(), 0.9, this.rep, pt);
};
*/

OutilDtParCoef.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  this.dt = new CDroiteOm(list, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, list.premierRepVis(), elg, new CValeur(list, 0))
  const self = this
  new CoefDirDlg(app, this.dt, false, function () { self.callBackOK() }, function () { self.reselect() })
}

OutilDtParCoef.prototype.ajouteObjetsVisuels = function () {}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilDtParCoef.prototype.callBackOK = function callBackOK () {
  const app = this.app
  app.ajouteElement(this.dt)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.dt.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement()
    this.saveFig()
    this.nbPtsCrees = 0
    this.reselect()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtParCoef.prototype.creationPointPossible = function () {
  return true
}

OutilDtParCoef.prototype.preIndication = function () {
  return 'DtParCoef'
}

OutilDtParCoef.prototype.isLineTool = function () {
  return true
}
