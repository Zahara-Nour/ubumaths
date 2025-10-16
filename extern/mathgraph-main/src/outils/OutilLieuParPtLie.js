/*
 * Created by yvesb on 12/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilLieuParPtLieAncetre from './OutilLieuParPtLieAncetre'
import CLieuDePoints from '../objets/CLieuDePoints'
import InfoLieu from '../types/InfoLieu'
import LieuDlg from '../dialogs/LieuDlg'
export default OutilLieuParPtLie
/**
 * Outil servant à créer un lieu de points reliés généré par un point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLieuParPtLie (app) {
  OutilLieuParPtLieAncetre.call(this, app, 'LieuParPtLie', 32819)
}

OutilLieuParPtLie.prototype = new OutilLieuParPtLieAncetre()

OutilLieuParPtLie.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  this.lieu = new CLieuDePoints(list, null, false, app.getCouleur(), false, app.getStyleTrait(), this.pointPourTrace,
    new InfoLieu(200, false, false), this.pointLieGenerateur)
  new LieuDlg(app, this.lieu, false, function () { self.actionApresDlgOK() }, function () { self.app.activeOutilCapt() })
}

OutilLieuParPtLie.prototype.preIndication = function () {
  return 'LieuParPtLie'
}
