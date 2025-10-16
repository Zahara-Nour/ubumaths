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
import COrdMinRep from '../objets/COrdMinRep'
import NatCal from '../types/NatCal'

export default OutilOrdMinRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilOrdMinRep (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'OrdMinRep', 34014, false, false, false, false)
}

OutilOrdMinRep.prototype = new Outil()

OutilOrdMinRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new COrdMinRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 6, false, null, null)
  this.app.activeOutilCapt()
}

OutilOrdMinRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
