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
export default OutilFonc3Var

/**
 * Contrairement à son nom, cet outil permet de créer des fonctions de 3 à 6 variables
 * @param app
 * @constructor
 * @extends Outil
 */
function OutilFonc3Var (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Fonc3Var', 32999, false, false, false, false)
}
OutilFonc3Var.prototype = new Outil()

OutilFonc3Var.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const fon = new CFoncNVar(this.app.listePr, null, false, '', '', ['x', 'y', 'z'], null)
  // Modifié version 6.4 pour que la touche F2 de rapple de l'outil précédent fonctionne
  // new FonctionDlg(app, fon, false, true, function() {app.activeOutilCapt()}, function() {app.activeOutilCapt()});
  new FonctionDlg(app, fon, false, true, null, null)
  app.activeOutilCapt()
}
