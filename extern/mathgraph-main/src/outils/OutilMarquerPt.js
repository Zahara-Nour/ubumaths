/*
 * Created by yvesb on 11/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import Outil from './Outil'
import toast from '../interface/toast'
export default OutilMarquerPt
/**
 * Outil servant à marquer un point pour la trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMarquerPt (app) {
  Outil.call(this, app, 'MarquerPt', 32029, true)
}

OutilMarquerPt.prototype = new Outil()

OutilMarquerPt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  // On fait clignoter les points mobiles libres
  app.listeClignotante.ajoutePointsMarquesPourTrace(app.listePr, false)
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigné un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  app.indication('indMarq')
}

OutilMarquerPt.prototype.traiteObjetDesigne = function (elg) {
  elg.marquePourTrace = true
  toast({ title: 'PtMarque' })
  this.enleveDeClign(elg)
  this.saveFig()
}
