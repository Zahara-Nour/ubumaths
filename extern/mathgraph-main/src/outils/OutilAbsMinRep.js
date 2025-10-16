/*
 * Created by yvesb on 19/04/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from './Outil'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import CAbsMinRep from '../objets/CAbsMinRep'
import NatCal from '../types/NatCal'

export default OutilAbsMinRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilAbsMinRep (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'AbsMinRep', 34012, false, false, false, false)
}

OutilAbsMinRep.prototype = new Outil()

OutilAbsMinRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new CAbsMinRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 4, false, null, null)
  this.app.activeOutilCapt()
}

OutilAbsMinRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
