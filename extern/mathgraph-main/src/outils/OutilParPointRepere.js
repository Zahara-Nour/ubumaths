/*
 * Created by yvesb on 21/01/2017.
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

export default OutilParPointRepere

/**
 * Outil ancêtre des outils de création de mesure dans un repère en cliquant sur un point
 * Les outils descendants dovent définir une finction OutilMesAbsRep.prototype.getMesure = function(st, rep)
 * renvoyant l'objet créé de nom st et associé au repère rep
 * @param {MtgApp} app L'application propriétaire
 * @param toolName Le nom de l'outil
 * @param toolIndex l'index de l'outil
 * @constructor
 * @extends Outil
 */
function OutilParPointRepere (app, toolName, toolIndex) {
  Outil.call(this, app, toolName, toolIndex, true) // Le dernier paramètre doit être true car on gère le clignotement.
}

OutilParPointRepere.prototype = new Outil()

OutilParPointRepere.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilParPointRepere.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset() // true pour ne pouvoir modifier que les objets modifiables par menu
  app.indication('indPt', this.preIndication())
}

OutilParPointRepere.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  this.point = elg
  const self = this
  this.resetClignotement()
  this.ajouteClignotementDe(elg)
  new NomMesureDlg(app, this.toolName, function (st, rep) { self.callBackOK(st, rep) }, function () { self.reselect() }, true)
}

OutilParPointRepere.prototype.callBackOK = function (st, rep) {
  const app = this.app
  const mes = this.getMesure(st, rep)
  app.ajouteElement(mes)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    // Il faut vérifier si le point mesuré est bien nommé
    if (this.point.nom === '') {
      this.point.donneNom(app.listePr.genereNomPourPoint())
      this.point.updateName()
    }
    this.annuleClignotement()
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
}
