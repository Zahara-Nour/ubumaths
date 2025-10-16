/*
 * Created by yvesb on 18/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import SavePNGWithUnityDlg from '../dialogs/SavePNGWithUnityDlg'
export default OutilSavePNGWithUnity
/**
 * Outil servant à enregistrer la figure dans un fichier png avec repsect de la longueur unité
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSavePNGWithUnity (app) {
  Outil.call(this, app, 'SavePNGWityUnity', -1, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilSavePNGWithUnity.prototype = new Outil()

OutilSavePNGWithUnity.prototype.select = function () {
  new SavePNGWithUnityDlg(this.app, true)
}

OutilSavePNGWithUnity.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}
