/*
 * Created by yvesb on 13/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilAdd

/**
 * Outil servant à créer un outil permettant d'activer des outils supplémentaires via une boîte de dialogue
 * @param {MtgApp} app Application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {string[]} toolArray array contenant les noms des outils que cet outil propose.
 * @constructor
 */
function OutilAdd (app, toolName, toolArray) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, toolName, -1, false, false, false, false)
  this.toolArray = toolArray
}
OutilAdd.prototype = new Outil()

OutilAdd.prototype.activationValide = function () {
  for (let i = 0; i < this.toolArray.length; i++) {
    const tool = this.app['outil' + this.toolArray[i]]
    if ((tool.activationValide() && this.app.doc.toolDispo(tool.toolIndex) && this.app.level.toolDispo(tool.toolIndex))) return true
  }
  return false
}
