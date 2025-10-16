/*
 * Created by yvesb on 31/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Outil from '../outils/Outil'
import CPointParAffixe from '../objets/CPointParAffixe'
import CValeurComp from '../objets/CValeurComp'
import PtParAffDlg from '../dialogs/PtParAffDlg'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilPtParAff
/**
 * Outil servant à créer l'image d'un objet par une rotation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPtParAff (app) {
  Outil.call(this, app, 'PtParAff', 33137, false) // fakse car pas de clignotement
}

OutilPtParAff.prototype = new Outil()

OutilPtParAff.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilPtParAff.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const li = app.listePr
  const aff = new CValeurComp(li)
  this.point = new CPointParAffixe(li, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, li.premierRepVis(), aff)
  const self = this
  new PtParAffDlg(app, this.point, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilPtParAff.prototype.actionApresDlgOK = function () {
  const app = this.app
  app.ajouteElement(this.point)
  if (app.verifieDernierElement(1)) {
    // Le point créé existe bien et n'a pas été déjà créé
    this.point.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt() // Après création on revient à l'outil de capture
}

OutilPtParAff.prototype.isPointTool = function () {
  return true
}
