/*
 * Created by yvesb on 01/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CSolutionEquation from '../objets/CSolutionEquation'
import SolutionEqDlg from '../dialogs/SolutionEqDlg'
import CValeur from '../objets/CValeur'
import CConstante from '../objets/CConstante'

export default OutilSolutionEq

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilSolutionEq (app) {
  Outil.call(this, app, 'SolutionEq', 32989)
}
OutilSolutionEq.prototype = new Outil()

OutilSolutionEq.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const calc = new CSolutionEquation(this.app.listePr, null, false, '', new CValeur(list, 0), new CValeur(list, 0),
    new CValeur(list, 1), '', new CConstante(list, 0))
  new SolutionEqDlg(this.app, calc, false, null, null)
  this.app.activeOutilCapt()
}
