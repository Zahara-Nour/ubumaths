/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import MacroDlg from './MacroDlg'

export default MacDesactTrDlg

/**
 * Dialogue de création ou modification d'une macro de désactivation du mode trace
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée"
 * @param {boolean} modification  true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacDesactTrDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  this.addTabPrincipal()
  this.create('MacDesactTr', 480)
}

MacDesactTrDlg.prototype = new MacroDlg()
