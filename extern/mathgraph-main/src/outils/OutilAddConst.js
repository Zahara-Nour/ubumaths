/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilAddConst
/**
 * Outil servant à proposer un menu pour la gestion des constructions
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 *
 */
function OutilAddConst (app) {
  // Attention : Pour cet outil le troisième paramètre est "GestionConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  Outil.call(this, app, 'GestionConst', -1, false, false, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilAddConst.prototype = new Outil()

OutilAddConst.prototype.select = function () {
  const app = this.app
  const callbackOK = function (file) {
    app.addProtoFromFile(file)
    app.activeOutilCapt()
  }
  app.addInputForOpenDlg('mgc', callbackOK, function () {
    app.activeOutilCapt()
  })
}
