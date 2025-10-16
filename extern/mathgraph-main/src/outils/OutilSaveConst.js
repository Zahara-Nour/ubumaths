/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import ChoixConstFigDlg from '../dialogs/ChoixConstFigDlg'
export default OutilSaveConst
/**
 * Outil servant à enregistrer dans un fichier une construction de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSaveConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "GestionConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'GestionConst', -1, false, false, false, false)
}

OutilSaveConst.prototype = new Outil()

OutilSaveConst.prototype.activationValide = function () {
  return this.app.doc.tablePrototypes.length > 0
}

OutilSaveConst.prototype.select = function () {
  const app = this.app
  new ChoixConstFigDlg(app, 'Save', function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}
