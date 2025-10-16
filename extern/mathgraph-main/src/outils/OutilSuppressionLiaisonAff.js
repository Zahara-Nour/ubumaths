/*
 * Created by yvesb on 25/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObjAdd'

export default OutilSuppressionLiaisonAff

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSuppressionLiaisonAff (app) {
  Outil.call(this, app, 'SuppressionLiaisonAff', 32875, true)
}

OutilSuppressionLiaisonAff.prototype = new Outil()

OutilSuppressionLiaisonAff.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.aff = null // Pointera sur le point libre qu'on veut lier à un objet
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.listeClignotante.ajouteAffichagesLiesAPointVisibles(app.listePr, true)
  app.outilPointageActif.aDesigner = NatObj.NAffLieAPoint
  app.outilPointageActif.reset(false, true)
  this.resetClignotement()
  app.indication('indSupLiaisonAff')
}

OutilSuppressionLiaisonAff.prototype.traiteObjetDesigne = function (elg) {
  if (this.aff === null) {
    this.annuleClignotement()
    this.aff = elg
    this.aff.pointLie = null
    this.saveFig()
    this.app.activeOutilCapt()
  }
}

OutilSuppressionLiaisonAff.prototype.activationValide = function () {
  return this.app.listePr.nombreAffichagesLiesAPointVisibles(true) > 0
}
