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
import CArgument from '../objets/CArgument'
import NatCal from '../types/NatCal'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default OutilArgument

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilArgument (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Argument', 33143, false, false, false, false)
}
OutilArgument.prototype = new Outil()

OutilArgument.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CArgument(list, null, false, '', null)
  new PartieReelleDlg(app, part, 4, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilArgument.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NTteValC) > 0)
}
