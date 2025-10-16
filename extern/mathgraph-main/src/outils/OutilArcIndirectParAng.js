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
import CArcDeCercleIndirect from '../objets/CArcDeCercleIndirect'
import AngleArcDlg from '../dialogs/AngleArcDlg'
import CConstante from '../objets/CConstante'
import OutilArcPetitParAng from '../outils/OutilArcPetitParAng'
export default OutilArcIndirectParAng

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilArcIndirectParAng (app) {
  OutilArcPetitParAng.call(this, app, 'ArcIndirectParAng', 32793, true)
}

OutilArcIndirectParAng.prototype = new OutilArcPetitParAng()

OutilArcIndirectParAng.prototype.creeObjet = function () {
  const app = this.app
  const self = this
  // if (app.lastDlgId() === "angleArcDlg") return;
  const li = app.listePr
  const ang = new CValeurAngle(li, new CConstante(li, 1))
  this.arc = new CArcDeCercleIndirect(li, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2, null, ang)
  new AngleArcDlg(this.app, this.arc, false, function () {
    self.actionApresDlgOK()
  }, function () { self.reselect() })
}

OutilArcIndirectParAng.prototype.preIndication = function () {
  return 'ArcIndirectParAng'
}

OutilArcIndirectParAng.prototype.isLineTool = function () {
  return true
}
