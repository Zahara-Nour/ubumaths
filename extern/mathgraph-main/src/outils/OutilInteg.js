/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CIntegrale from '../objets/CIntegrale'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'
import IntegraleDlg from '../dialogs/IntegraleDlg'

export default OutilInteg

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilInteg (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'Integ', 33008, false, false, false, false)
}
OutilInteg.prototype = new Outil()

OutilInteg.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const integ = new CIntegrale(list, null, false, '', null, new CValeur(list, 0), new CValeur(list, 0), new CValeur(list, 0))
  new IntegraleDlg(this.app, integ, false, null, null)
  this.app.activeOutilCapt()
}

OutilInteg.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NCalcouFoncParFormule) >= 2)
}
