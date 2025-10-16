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
import CSomme from '../objets/CSomme'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'
import SomProdDlg from '../dialogs/SomProdDlg'

export default OutilSomInd

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilSomInd (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'SomInd', 33187, false, false, false, false)
}
OutilSomInd.prototype = new Outil()

OutilSomInd.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CSomme(list, null, false, '', null, null, new CValeur(list, 0), new CValeur(list, 0))
  new SomProdDlg(this.app, part, false, true, null, null)
  this.app.activeOutilCapt()
}

OutilSomInd.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
