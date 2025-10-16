/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CPartieImaginaire from '../objets/CPartieImaginaire'
import NatCal from '../types/NatCal'
import PartieReelleDlg from '../dialogs/PartieReelleDlg'

export default OutilPartieImaginaire

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilPartieImaginaire (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'PartieImaginaire', 33136, false, false, false, false)
}
OutilPartieImaginaire.prototype = new Outil()

OutilPartieImaginaire.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const list = this.app.listePr
  const part = new CPartieImaginaire(list, null, false, '', null)
  new PartieReelleDlg(app, part, 2, false, function () { app.activeOutilCapt() }, function () { app.activeOutilCapt() })
}

OutilPartieImaginaire.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NTteValC) > 0)
}
