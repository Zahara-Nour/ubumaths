/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilReInitConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilReInitConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "CreationConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, false, false, false, false)
}

OutilReInitConst.prototype = new Outil()

OutilReInitConst.prototype.select = function () {
  const app = this.app
  app.reInitConst()
  app.activeOutilCapt()
}

OutilReInitConst.prototype.activationValide = function () {
  const app = this.app
  return app.listeSrcG.longueur() > 0 || app.listeSrcNG.longueur() > 0
}
