/*
 * Created by yvesb on 17/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import CCercleOR from '../objets/CCercleOR'
import CValeur from '../objets/CValeur'
import CConstante from '../objets/CConstante'
import RayonDlg from '../dialogs/RayonDlg'
import NatObj from '../types/NatObj'
import AvertDlg from '../dialogs/AvertDlg'
import ConfirmDlg from '../dialogs/ConfirmDlg'
export default OutilCerOR

/**
 * Outil servant à créer un cercle par centre et rayon
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCerOR (app) {
  Outil.call(this, app, 'CerOR', 32797, true)
}

OutilCerOR.prototype = new Outil()

OutilCerOR.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.centre = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indCentre', 'CerOR')
}

OutilCerOR.prototype.deselect = function () {
  this.centre = null
  Outil.prototype.deselect.call(this)
}

OutilCerOR.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  // if (app.lastDlgId() === this.id + "rayonDlg") return;
  const li = app.listePr
  if (this.centre === null) {
    this.centre = elg
    const ray = new CValeur(li, new CConstante(li, 1))
    this.cer = new CCercleOR(li, null, false, app.getCouleur(), false, app.getStyleTrait(), elg, ray, false)
    this.excluDeDesignation(this.centre)
    this.ajouteClignotementDe(this.centre)
    this.resetClignotement() // Sous Chrome, si on fait clignoter le centre le curseur de la boîte de dialogue ne clignote plus ...
    const self = this
    new RayonDlg(this.app, this.cer, false, function () { self.actionApresDlgOK() }, function () { self.reselect() })
  }
}

OutilCerOR.prototype.actionApresDlgOK = function () {
  const app = this.app
  const self = this
  app.ajouteElement(this.cer)
  if (app.verifieDernierElement(1)) {
    // Le cercle créé existe bien et n'a pas été déjà créé
    // On vérifie que le cercle n'est pas hors-fenêtre
    if (this.cer.dansFen()) this.finitAction()
    else {
      new ConfirmDlg(app, 'HorsFen', function () {
        self.finitAction()
      }, function () {
        self.app.detruitDernierElement()
        self.reselect()
      })
    }
  } else {
    new AvertDlg(app, 'DejaCree')
    this.reselect()
  }
}

OutilCerOR.prototype.finitAction = function () {
  const app = this.app
  this.cer.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
  this.saveFig()
  this.nbPtsCrees = 0
  this.reselect()
}

OutilCerOR.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilCerOR.prototype.creationPointPossible = function () {
  return true
}

OutilCerOR.prototype.isLineTool = function () {
  return true
}
