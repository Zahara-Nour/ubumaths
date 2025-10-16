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
import CPartieReelle from '../objets/CPartieReelle'
import NatCal from '../types/NatCal'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default OutilPartieReelle

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilPartieReelle (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'PartieReelle', 33135, false, false, false, false)
}
OutilPartieReelle.prototype = new Outil()

OutilPartieReelle.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CPartieReelle(list, null, false, '', null)
  new PartieReelleDlg(app, part, 1, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilPartieReelle.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NTteValC) > 0)
}
