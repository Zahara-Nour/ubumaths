/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import DeterminantDlg from '../dialogs/DeterminantDlg'
import NatCal from '../types/NatCal'
export default OutilDet

/**
 * Outil pour créer un déterminant d'une matrice carrée
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilDet (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Det', 32050, false, false, false, false)
}
OutilDet.prototype = new Outil()

OutilDet.prototype.select = function () {
  new DeterminantDlg(this.app)
  this.app.activeOutilCapt()
}

OutilDet.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NTteMatrice) > 0
}
