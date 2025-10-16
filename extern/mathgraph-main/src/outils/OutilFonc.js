/*
 * Created by yvesb on 09/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CFonc from '../objets/CFonc'
import FonctionDlg from '../dialogs/FonctionDlg'

export default OutilFonc

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilFonc (app) {
  Outil.call(this, app, 'Fonc', 32880)
}

// on hérite d'Outil
OutilFonc.prototype = new Outil()

OutilFonc.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  const callBack = function () { app.activeOutilCapt() }
  const fonc = new CFonc(this.app.listePr, null, false, '', '', 'x')
  new FonctionDlg(this.app, fonc, false, true, callBack, callBack)
}

OutilFonc.prototype.isLineTool = function () {
  return true
}
