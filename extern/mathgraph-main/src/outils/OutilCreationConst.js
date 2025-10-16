/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import OutilAddDlg from '../dialogs/OutilAddDlg'
export default OutilCreationConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilCreationConst (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, false, false, false, false)
}

OutilCreationConst.prototype = new Outil()

OutilCreationConst.prototype.select = function () {
  const app = this.app
  app.outilActif.deselect()
  Outil.prototype.select.call(this)
  new OutilAddDlg(this.app, this.app.outilAddCreationConst, 'CreationConst')
}
