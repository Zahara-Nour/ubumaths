/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import ChoixConstFigDlg from '../dialogs/ChoixConstFigDlg'
export default OutilSupConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilSupConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "GestionConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'GestionConst', -1, false, false, false, false)
}

OutilSupConst.prototype = new Outil()

OutilSupConst.prototype.select = function () {
  const app = this.app
  new ChoixConstFigDlg(this.app, 'Supprimer', function () {
    app.activeOutilCapt()
  },
  function () {
    app.activeOutilCapt()
  })
}

OutilSupConst.prototype.activationValide = function () {
  return this.app.doc.tablePrototypes.length > 0
}
