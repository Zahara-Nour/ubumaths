/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import COrdonneeOrigineRep from '../objets/COrdonneeOrigineRep'
import InfoRepDlg from '../dialogs/InfoRepDlg'
import NatCal from '../types/NatCal'
export default OutilOrdOrRep

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilOrdOrRep (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'OrdOrRep', 32032, false, false, false, false)
}
OutilOrdOrRep.prototype = new Outil()

OutilOrdOrRep.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const calc = new COrdonneeOrigineRep(list, null, false, '', list.premierRepVis())
  new InfoRepDlg(app, calc, 1, false, null, null)
  this.app.activeOutilCapt()
}

OutilOrdOrRep.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
