/*
 * Created by yvesb on 03/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLongueur from '../objets/CLongueur'
import OutilPar2Pts from './OutilPar2Pts'
import AvertDlg from '../dialogs/AvertDlg'
import { getStr } from '../kernel/kernel'

export default OutilLongUnit
/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLongUnit (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  OutilPar2Pts.call(this, app, 'LongUnit', 32843, false, false, false, false)
}

OutilLongUnit.prototype = new OutilPar2Pts()

OutilLongUnit.prototype.preIndication = function () {
  return 'LongUnit'
}

OutilLongUnit.prototype.creeObjet = function () {
  this.annuleClignotement()
  const app = this.app
  const li = app.listePr
  const lon = new CLongueur(li, null, false, this.point1, this.point2)
  li.pointeurLongueurUnite = lon
  app.ajouteElement(lon)
  new AvertDlg(this.app, getStr('AvertLu1') + this.point1.nom + this.point2.nom + getStr('AvertLu2'))
  this.saveFig()
  this.objetCree = true
  app.activeOutilCapt()
  return true
}

OutilLongUnit.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite === null
}

OutilLongUnit.prototype.nomsPointsIndisp = function () {
  return true
}
