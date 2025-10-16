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
import CProduit from '../objets/CProduit'
import NatCal from '../types/NatCal'
import CValeur from '../objets/CValeur'
import SomProdDlg from '../dialogs/SomProdDlg'

export default OutilProdInd

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilProdInd (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'ProdInd', 33188, false, false, false, false)
}
OutilProdInd.prototype = new Outil()

OutilProdInd.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CProduit(list, null, false, '', null, null, new CValeur(list, 0), new CValeur(list, 0))
  new SomProdDlg(this.app, part, false, false, null, null)
  this.app.activeOutilCapt()
}

OutilProdInd.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
