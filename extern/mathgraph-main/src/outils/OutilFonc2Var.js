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
import CFoncNVar from '../objets/CFoncNVar'
import FonctionDlg from '../dialogs/FonctionDlg'
export default OutilFonc2Var

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilFonc2Var (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Fonc2Var', 32996, false, false, false, false)
}
OutilFonc2Var.prototype = new Outil()

OutilFonc2Var.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const fon = new CFoncNVar(app.listePr, null, false, '', '', ['x', 'y'], null)
  // Modifié version 6.4 pour que la touche F2 de rapple de l'outil précédent fonctionne
  // new FonctionDlg(app, fon, false, true, function() {app.activeOutilCapt()}, function() {app.activeOutilCapt()});
  new FonctionDlg(app, fon, false, true, null, null)
  app.activeOutilCapt()
}
