/*
 * Created by yvesb on 18/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CFoncComplexe from '../objets/CFoncComplexe'
import FonctionDlg from '../dialogs/FonctionDlg'
export default OutilFoncComp

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilFoncComp (app) {
  Outil.call(this, app, 'FoncComp', 33134)
}
OutilFoncComp.prototype = new Outil()

OutilFoncComp.prototype.select = function () {
  Outil.prototype.select.call(this)
  const fonc = new CFoncComplexe(this.app.listePr, null, false, '', '', 'z')
  new FonctionDlg(this.app, fonc, false, false, null, null)
  this.app.activeOutilCapt()
}
