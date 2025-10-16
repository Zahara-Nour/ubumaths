/*
 * Created by yvesb on 20/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Outil from '../outils/Outil'
import CPointBaseEnt from '../objets/CPointBaseEnt'
import PtBaseEntDlg from '../dialogs/PtBaseEntDlg'
import CValeur from '../objets/CValeur'
import Pointeur from '../types/Pointeur'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilPtBaseEnt
/**
 * Outil servant à créer l'image d'un objet par une rotation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPtBaseEnt (app) {
  Outil.call(this, app, 'PtBaseEnt', 33113, false) // fakse car pas de clignotement
}

OutilPtBaseEnt.prototype = new Outil()

OutilPtBaseEnt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  this.nbrep = list.nombreObjetsCalcul(NatCal.NRepere)
  this.pt = new CPointBaseEnt(list, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, false, list.premierRepVis(), true, true, new CValeur(list, -5),
    new CValeur(list, 5), new CValeur(list, -5), new CValeur(list, 5))
  this.app.outilPointageActif = this.app.outilPointageClic
  this.app.outilPointageActif.reset()
  if (this.nbrep > 1) new PtBaseEntDlg(app, this.pt, false, null, null)
  app.indication('indPtBaseEnt')
}

OutilPtBaseEnt.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  if (app.dlg.length !== 0) return // Si le dialogue est ouvert on attend qu'il se ferme
  this.creeObjet(point)
  if (this.nbrep > 1) app.activeOutilCapt()
  else {
    this.deselect()
    this.select()
  }
}

OutilPtBaseEnt.prototype.creeObjet = function (point) {
  const app = this.app
  const abs = new Pointeur()
  const pointres = { x: 0, y: 0 }
  this.pt.testDeplacement(app.dimf, point.x, point.y, pointres, abs)
  this.pt.placeEn(pointres.x, pointres.y)
  this.pt.donneCouleur(app.getCouleur())
  this.pt.donneMotif(app.getStylePoint())
  app.ajouteElement(this.pt)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    this.pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
}

OutilPtBaseEnt.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilPtBaseEnt.prototype.isPointTool = function () {
  return true
}
