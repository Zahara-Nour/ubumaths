/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import MatriceParTxtDlg from 'src/dialogs/MatriceParTxtDlg'

export default OutilMatriceParTxt

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilMatriceParTxt (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'MatriceParTxt', 32051, false, false, false, false)
}

OutilMatriceParTxt.prototype = new Outil()

OutilMatriceParTxt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  new MatriceParTxtDlg(app, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
