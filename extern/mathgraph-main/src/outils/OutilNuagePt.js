/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NuagePtsDlg from 'src/dialogs/NuagePtsDlg'
import NatCal from 'src/types/NatCal'

export default OutilNuagePt

/**
 * Outil pour créer un nuage de points à partir d'une matrice à deux colonnes
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilNuagePt (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'NuagePt', 32053, false, false, false, false)
}

OutilNuagePt.prototype = new Outil()

OutilNuagePt.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const callBack = function () { app.activeOutilCapt() }
  new NuagePtsDlg(app, callBack, callBack)
}

OutilNuagePt.activationValide = function () {
  const list = this.app.listePr
  return list.tabMat2Col().length > 0 && list.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilNuagePt.prototype.isPointTool = function () {
  return true
}
