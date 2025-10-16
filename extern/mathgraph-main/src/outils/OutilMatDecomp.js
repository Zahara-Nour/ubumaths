/*
 * Created by yvesb on 14/06/2022.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from 'src/outils/Outil'
import MatriceDecompDlg from 'src/dialogs/MatriceDecompDlg'
import CMatriceDecomp from 'src/objets/CMatriceDecomp'

export default OutilMatDecomp

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilMatDecomp (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'MatriceDecomp', 32055, false, false, false, false)
}

OutilMatDecomp.prototype = new Outil()

OutilMatDecomp.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const mat = new CMatriceDecomp(list, null, false, '', null)
  new MatriceDecompDlg(app, mat, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
