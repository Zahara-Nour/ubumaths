/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import OutilAddDlg from '../dialogs/OutilAddDlg'
export default OutilExportFig

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilExportFig (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Export', -1, false, false, false, false)
}

OutilExportFig.prototype = new Outil()

OutilExportFig.prototype.select = function () {
  new OutilAddDlg(this.app, this.app.outilAddExport, 'Export')
}
