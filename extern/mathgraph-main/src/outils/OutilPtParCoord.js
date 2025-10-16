/*
 * Created by yvesb on 27/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Outil from '../outils/Outil'
import CPointDansRepere from '../objets/CPointDansRepere'
import CValeur from '../objets/CValeur'
import PtParCoordDlg from '../dialogs/PtParCoordDlg'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilPtParCoord
/**
 * Outil servant à créer l'image d'un objet par une rotation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPtParCoord (app) {
  Outil.call(this, app, 'PtParCoord', 32782, false) // fakse car pas de clignotement
}

OutilPtParCoord.prototype = new Outil()

OutilPtParCoord.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilPtParCoord.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const li = app.listePr
  const abs = new CValeur(li, 1)
  const ord = new CValeur(li, 1)
  this.point = new CPointDansRepere(li, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, li.premierRepVis(), abs, ord)
  const self = this
  new PtParCoordDlg(app, this.point, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilPtParCoord.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.ajouteElement(this.point)
  if (app.verifieDernierElement(1)) {
    // Le point créé existe bien et n'a pas été déjà créé
    this.point.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt() // Après création on revient à l'outil de capture
}

OutilPtParCoord.prototype.isPointTool = function () {
  return true
}
