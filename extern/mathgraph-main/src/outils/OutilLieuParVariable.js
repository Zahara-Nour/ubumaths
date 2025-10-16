/*
 * Created by yvesb on 06/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilLieuParVariableAncetre from './OutilLieuParVariableAncetre'
import CLieuParVariable from '../objets/CLieuParVariable'
import InfoLieu from '../types/InfoLieu'
import LieuDlg from '../dialogs/LieuDlg'
export default OutilLieuParVariable

/**
 * Outil servant à créer un lieu de points reliés généré par un point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLieuParVariable (app) {
  OutilLieuParVariableAncetre.call(this, app, 'LieuParVariable', 32886)
}

OutilLieuParVariable.prototype = new OutilLieuParVariableAncetre()

OutilLieuParVariable.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  this.lieu = new CLieuParVariable(list, null, false, app.getCouleur(), false, app.getStyleTrait(), this.pointPourTrace,
    new InfoLieu(200, false, false), this.va)
  new LieuDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuParVariable.prototype.preIndication = function () {
  return 'LieuParVariable'
}
