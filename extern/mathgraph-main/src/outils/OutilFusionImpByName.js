/*
 * Created by yvesb on 23/04/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from './Outil'
import NatObj from '../types/NatObj'
import FusionConstDlg from '../dialogs/FusionConstDlg'

export default OutilFusionImpByName

OutilFusionImpByName.prototype = new Outil()

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilFusionImpByName (app) {
  Outil.call(this, app, 'FusionImpByName', -1, false, false, false, false)
}

OutilFusionImpByName.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  new FusionConstDlg(app, () => {
    this.saveFig()
    app.activeOutilCapt()
  },
  function () {
    app.activeOutilCapt()
  })
}

OutilFusionImpByName.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsParNatureVisibles(NatObj.NImpProto) > 0)
}
