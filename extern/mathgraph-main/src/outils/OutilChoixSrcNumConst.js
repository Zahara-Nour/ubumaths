/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import ChoixSrcNumDlg from '../dialogs/ChoixSrcNumDlg'
import NatCal from '../types/NatCal'

export default OutilChoixSrcNumConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilChoixSrcNumConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "CreationConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, false, false, false, false)
}

OutilChoixSrcNumConst.prototype = new Outil()

OutilChoixSrcNumConst.prototype.select = function () {
  const app = this.app
  new ChoixSrcNumDlg(app)
}

OutilChoixSrcNumConst.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NTtObjNumSaufConst) > 0
}
