/*
 * Created by yvesb on 15/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import RenommerCalculDlg from '../dialogs/RenommerCalculDlg'
import NatCal from '../types/NatCal'
export default OutilRenommerCalcul

/**
 * Outil servant à renommer un calcul
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilRenommerCalcul (app) {
  Outil.call(this, app, 'RenommerCalcul', 33158)
}

OutilRenommerCalcul.prototype = new Outil()

OutilRenommerCalcul.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  new RenommerCalculDlg(app, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilRenommerCalcul.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NTtCalcNommeSaufConst) > 0
}
