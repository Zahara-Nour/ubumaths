/*
 * Created by yvesb on 23/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilPar3Pts from './OutilPar3Pts'
import AvertDlg from '../dialogs/AvertDlg'
import CRepere from '../objets/CRepere'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CValeur from '../objets/CValeur'
import RepDlg from '../dialogs/RepDlg'

export default OutilRepere
/**
 * Outil servant à créer un repère après avoir cliqué sur 3 points
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRepere (app) {
  OutilPar3Pts.call(this, app, 'Repere', 32848, true, false) // Dernier paramètre false car on réactive l'outil de capture après création
}

OutilRepere.prototype = new OutilPar3Pts()

OutilRepere.prototype.creeObjet = function () {
  const app = this.app
  const li = app.listePr
  const rep = new CRepere(li, null, false, new Color(230, 230, 230), false, StyleTrait.stfc(li), this.point1, this.point2, this.point3,
    new CValeur(li, 0), new CValeur(li, 0), true, true, false, new CValeur(li, 1), new CValeur(li, 1))
  app.ajouteElement(rep)
  const pasDejaCree = app.verifieDernierElement(1)
  if (pasDejaCree) {
    // La repère existe bien et n'a pas été déjà créé
    this.annuleClignotement()
    const self = this
    const infoAnnul = {
      pt1: this.point1,
      pt2: this.point2,
      pt3: this.point3,
      pt1Cree: this.point1Cree,
      pt2Cree: this.point2Cree,
      pt1Nomme: this.point1Nomme,
      pt2Nomme: this.point2Nomme,
      pt3Nomme: this.point3Nomme
    }
    new RepDlg(app, rep, false, function () { self.callBackAfterDlg(rep) }, function () { self.callBackCancel(infoAnnul) })
  } else new AvertDlg(app, 'DejaCree')
  return pasDejaCree
}

OutilRepere.prototype.callBackAfterDlg = function (rep) {
  // Le repère créé existe bien et n'a pas été déjà créé
  const app = this.app
  rep.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.saveFig()
  app.activeOutilCapt() // Après création on revient à l'outil de capture
}

OutilRepere.prototype.callBackCancel = function (infoAnnul) {
  this.app.detruitDernierElement()
  this.objetCree = false // Pour que les points éventuellemnt nommés par l'outil soient dénommés.
  this.point1 = infoAnnul.pt1
  this.point2 = infoAnnul.pt2
  this.point3 = infoAnnul.pt3
  this.point1Cree = infoAnnul.pt1Cree
  this.point2Cree = infoAnnul.pt2Cree
  this.point1Nomme = infoAnnul.pt1Nomme
  this.point2Nomme = infoAnnul.pt2Nomme
  this.point3Nomme = infoAnnul.pt3Nomme
  this.deselect()
  this.app.activeOutilCapt()
}

OutilRepere.prototype.nomsPointsIndisp = function () {
  return true
}

OutilRepere.prototype.preIndication = function () {
  return 'Repere'
}
