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
import AvertDlg from '../dialogs/AvertDlg'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import NomMesureDlg from '../dialogs/NomMesureDlg'

export default OutilParDroiteRepere

/**
 * Outil ancêtre des outils de création de mesure dans un repère en cliquant sur une droite
 * Les outils descendants dovent définir une finction OutilMesAbsRep.prototype.getMesure = function(st, rep)
 * rev=noyant l'objet créé de nom st et associé au repère rep
 * @param {MtgApp} app L'application propriétaire
 * @param nomOutil Le nom de m'outil
 * @param toolIndex l'index de l'outil
 * @constructor
 */
function OutilParDroiteRepere (app, nomOutil, toolIndex) {
  Outil.call(this, app, nomOutil, toolIndex, false)
}

OutilParDroiteRepere.prototype = new Outil()

OutilParDroiteRepere.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilParDroiteRepere.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTteDroite
  app.outilPointageCre.reset() // true pour ne pouvoir modifier que les objets modifiables par menu
  app.indication(this.indication(), this.preIndication())
}

OutilParDroiteRepere.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  this.dte = elg
  const self = this
  this.resetClignotement()
  this.ajouteClignotementDe(elg)
  new NomMesureDlg(app, this.tip, function (st, rep) { self.callBackOK(st, rep) }, function () { self.reselect() }, true)
}

OutilParDroiteRepere.prototype.callBackOK = function (st, rep) {
  const app = this.app
  const mes = this.getMesure(st, rep)
  app.ajouteElement(mes)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    // Il faut vérifier si le point mesuré est bien nommé
    if (this.dte.nom === '') {
      this.dte.donneNom(app.listePr.genereNomPourPointOuDroite('D'))
      this.dte.updateName()
    }
    this.annuleClignotement()
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
}
