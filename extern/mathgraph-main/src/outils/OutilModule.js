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
import CModule from '../objets/CModule'
import NatCal from '../types/NatCal'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default OutilModule

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilModule (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'Module', 33144, false, false, false, false)
}
OutilModule.prototype = new Outil()

OutilModule.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CModule(list, null, false, '', null)
  new PartieReelleDlg(app, part, 3, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilModule.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NTteValC) > 0)
}
