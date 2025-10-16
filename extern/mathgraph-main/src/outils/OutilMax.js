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
import CMaxFonc from '../objets/CMaxFonc'
import MaxMinDlg from '../dialogs/MaxMinDlg'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'

export default OutilMax

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilMax (app) {
  Outil.call(this, app, 'Max', 32025)
}
OutilMax.prototype = new Outil()

OutilMax.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const max = new CMaxFonc(list, null, false, '', null, new CValeur(list, 0), new CValeur(list, 0), new CValeur(list, 0))
  new MaxMinDlg(this.app, max, false, true, null, null)
  this.app.activeOutilCapt()
}

OutilMax.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NFonction) > 0
}
