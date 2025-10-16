/*
 * Created by yvesb on 06/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilLieuParVariableAncetre from './OutilLieuParVariableAncetre'
import CLieuDiscretParVariable from '../objets/CLieuDiscretParVariable'
import LieuDlg from '../dialogs/LieuDlg'
export default OutilLieuDiscretParVariable

/**
 * Outil servant à créer un lieu de points discret généré par une variable
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLieuDiscretParVariable (app) {
  OutilLieuParVariableAncetre.call(this, app, 'LieuDiscretParVariable', 33005)
}

OutilLieuDiscretParVariable.prototype = new OutilLieuParVariableAncetre()

OutilLieuDiscretParVariable.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  this.lieu = new CLieuDiscretParVariable(list, null, false, app.getCouleur(), false, this.pointPourTrace, 200,
    app.getStylePoint(), this.va)
  new LieuDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuDiscretParVariable.prototype.preIndication = function () {
  return 'LieuDiscretParVariable'
}
