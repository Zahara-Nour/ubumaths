/*
 * Created by yvesb on 07/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatCal from '../types/NatCal'
import CDeriveePartielle from '../objets/CDeriveePartielle'
import DeriveePartDlg from '../dialogs/DeriveePartDlg'

export default OutilDeriveePartielle

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilDeriveePartielle (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'DeriveePart', 32038, false, false, false, false)
}
OutilDeriveePartielle.prototype = new Outil()

OutilDeriveePartielle.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const der = new CDeriveePartielle(list, null, false, '', null, 0, null)
  new DeriveePartDlg(app, der, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilDeriveePartielle.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreObjetsCalcul(NatCal.NFoncRNvar) > 0
}
