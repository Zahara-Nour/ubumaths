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
import CMatrice from '../objets/CMatrice'
import MatriceDlg from '../dialogs/MatriceDlg'

export default OutilMatrice

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilMatrice (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'Matrice', 32046, false, false, false, false)
}
OutilMatrice.prototype = new Outil()

OutilMatrice.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const tabVal = []
  for (let i = 0; i < 2; i++) {
    const lig = []
    tabVal.push(lig)
    for (let j = 0; j < 2; j++) {
      lig.push(new CValeur(list, 0))
    }
  }
  const mat = new CMatrice(list, null, false, '', 2, 2, tabVal)
  new MatriceDlg(app, mat, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
