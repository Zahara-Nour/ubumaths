/*
 * Created by yvesb on 03/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CMinFonc from '../objets/CMinFonc'
import MaxMinDlg from '../dialogs/MaxMinDlg'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'

export default OutilMin

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilMin (app) {
  Outil.call(this, app, 'Min', 32024)
}
OutilMin.prototype = new Outil()

OutilMin.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const Min = new CMinFonc(list, null, false, '', null, new CValeur(list, 0), new CValeur(list, 0), new CValeur(list, 0))
  new MaxMinDlg(this.app, Min, false, false, null, null)
  this.app.activeOutilCapt()
}

OutilMin.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NFonction) > 0
}
