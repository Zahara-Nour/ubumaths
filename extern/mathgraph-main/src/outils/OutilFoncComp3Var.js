/*
 * Created by yvesb on 14/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CFoncComplexeNVar from '../objets/CFoncComplexeNVar'
import FonctionDlg from '../dialogs/FonctionDlg'
export default OutilFoncComp3Var

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilFoncComp3Var (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'FoncComp3Var', 33006, false, false, false, false)
}
OutilFoncComp3Var.prototype = new Outil()

OutilFoncComp3Var.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const fon = new CFoncComplexeNVar(this.app.listePr, null, false, '', '', ['x', 'y', 'z'], null)
  // Modifié version 6.4 pour que la touche F2 de rapple de l'outil précédent fonctionne
  // new FonctionDlg(app, fon, false, false, function() {app.activeOutilCapt()}, function() {app.activeOutilCapt()});
  new FonctionDlg(app, fon, false, false, null)
  app.activeOutilCapt()
}
