/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CalcR from '../kernel/CalcR'
import CMatriceParForm from '../objets/CMatriceParForm'
import MatriceParFormDlg from '../dialogs/MatriceParFormDlg'
import CValeur from 'src/objets/CValeur'

export default OutilMatriceParForm

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilMatriceParForm (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'MatriceParForm', 32049, false, false, false, false)
}

OutilMatriceParForm.prototype = new Outil()

OutilMatriceParForm.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const form = getStr('formMat')
  const mat = new CMatriceParForm(list, null, false, '', new CValeur(list, 3), new CValeur(list, 3),
    CalcR.ccb(form, list, 0, form.length - 1, ['i', 'j'], list))
  new MatriceParFormDlg(app, mat, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
