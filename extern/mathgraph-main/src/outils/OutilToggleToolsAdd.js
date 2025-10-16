/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilToggleToolsAdd
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilToggleToolsAdd (app) {
  Outil.call(this, app, 'ToggleToolsAdd', 32900, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilToggleToolsAdd.prototype = new Outil()

OutilToggleToolsAdd.prototype.select = function () {
  // L'application possède une variable toolsAddDlg qui est null quand les outils supplémentaires
  // ne sont pas disponibles et qui sinon pointe sur un ToolsAddDlg
  const app = this.app
  if (app.svgToolsAdd === null) {
    app.addToolsSup()
  } else {
    app.svg.removeChild(app.svgToolsAdd)
    app.svgToolsAdd = null
  }
  app.activeOutilCapt()
}
