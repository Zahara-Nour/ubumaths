/*
 * Created by yvesb on 07/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CValeur from '../objets/CValeur'
import CMatriceAleat from '../objets/CMatriceAleat'
import MatriceAleatDlg from '../dialogs/MatriceAleatDlg'

export default OutilMatriceAleat

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilMatriceAleat (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'MatriceAleat', 32048, false, false, false, false)
}

OutilMatriceAleat.prototype = new Outil()

OutilMatriceAleat.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const mat = new CMatriceAleat(list, null, false, '', 1, 10,
    new CValeur(list, 1), new CValeur(list, 10))
  new MatriceAleatDlg(app, mat, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
