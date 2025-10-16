/*
 * Created by yvesb on 10/01/2017.
 */
/**
 * Outil servant à créer un carré direct en cliquant sur deux points
 * Hérite de OutilArcPetitParAng donc inutile de redéfinir actionApresDlgOK
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
import CValeurAngle from '../objets/CValeurAngle'
import CGrandArcDeCercle from '../objets/CGrandArcDeCercle'
import AngleArcDlg from '../dialogs/AngleArcDlg'
import CConstante from '../objets/CConstante'
import OutilArcPetitParAng from '../outils/OutilArcPetitParAng'
export default OutilArcGrandParAng

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilArcGrandParAng (app) {
  OutilArcPetitParAng.call(this, app, 'ArcGrandParAng', 32796, true)
}

OutilArcGrandParAng.prototype = new OutilArcPetitParAng()

OutilArcGrandParAng.prototype.creeObjet = function () {
  const app = this.app
  const self = this
  // if (app.lastDlgId() === "angleArcDlg") return;
  const li = app.listePr
  const ang = new CValeurAngle(li, new CConstante(li, 1))
  this.arc = new CGrandArcDeCercle(li, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2, null, ang)
  new AngleArcDlg(this.app, this.arc, false, function () { self.actionApresDlgOK() }, function () { self.reselect() })
}

OutilArcGrandParAng.prototype.preIndication = function () {
  return 'ArcGrandParAng'
}

OutilArcGrandParAng.prototype.isLineTool = function () {
  return true
}
