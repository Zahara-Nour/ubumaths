/*
 * Created by yvesb on 02/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CDerivee from '../objets/CDerivee'
import DeriveeDlg from '../dialogs/DeriveeDlg'

export default OutilDerivee

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilDerivee (app) {
  Outil.call(this, app, 'Derivee', 33132)
}
OutilDerivee.prototype = new Outil()

OutilDerivee.prototype.select = function () {
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const der = new CDerivee(list, null, false, '', null, null)
  new DeriveeDlg(this.app, der, false, null, null)
  this.app.activeOutilCapt()
}

OutilDerivee.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.nombreFonctionsDerivables() > 0
}
