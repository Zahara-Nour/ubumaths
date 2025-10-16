/*
 * Created by yvesb on 13/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilLieuParPtLieAncetre from './OutilLieuParPtLieAncetre'
import CLieuDiscretParPointLie from '../objets/CLieuDiscretParPointLie'
import LieuDlg from '../dialogs/LieuDlg'
export default OutilLieuDiscretParPtLie

/**
 * Outil servant à créer un lieu de points discret généré par un point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLieuDiscretParPtLie (app) {
  OutilLieuParPtLieAncetre.call(this, app, 'LieuDiscretParPtLie', 33004)
}

OutilLieuDiscretParPtLie.prototype = new OutilLieuParPtLieAncetre()

OutilLieuDiscretParPtLie.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  this.lieu = new CLieuDiscretParPointLie(list, null, false, app.getCouleur(), false, this.pointPourTrace, 200,
    app.getStylePoint(), this.pointLieGenerateur)
  new LieuDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuDiscretParPtLie.prototype.preIndication = function () {
  return 'LieuDiscretParPtLie'
}
