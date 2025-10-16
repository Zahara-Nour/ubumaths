/*
 * Created by yvesb on 06/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import MtgDlg from './MtgDlg'
import PaneChoixVar from './PaneChoixVar'
import 'jquery-textrange'
export default ChoixVariableDlg

/**
 * Boîte de dialogue proposant une liste formé de toutes les variables existantes
 * @constructor
 * @param {MtgApp} app La MtgApp Propriétaire
 * @param callBackOK Fonction appelée quand l'utilateur valide, va étant la variable choisie
 * @param callBackCancel onction appelée quand l'utilisateur annule
 */
function ChoixVariableDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'choixVariableDlg', callBackOK, callBackCancel)
  this.paneChoixVar = new PaneChoixVar(app, false)
  this.appendChild(this.paneChoixVar.container)
  this.create('ChoixValeur', 400)
}

ChoixVariableDlg.prototype = new MtgDlg()

ChoixVariableDlg.prototype.OK = function () {
  this.callBackOK(this.paneChoixVar.getVar())
  this.destroy()
}
