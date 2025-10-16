/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import OutilAddDlg from '../dialogs/OutilAddDlg'
export default OutilGestionConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilGestionConst (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'GestionConst', -1, false, false, false, false)
}

OutilGestionConst.prototype = new Outil()

OutilGestionConst.prototype.select = function () {
  const app = this.app
  app.outilActif.deselect()
  Outil.prototype.select.call(this)
  new OutilAddDlg(this.app, this.app.outilAddGestionConst, 'GestionConst')
}
