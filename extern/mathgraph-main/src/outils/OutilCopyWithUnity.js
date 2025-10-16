/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import SavePNGWithUnityDlg from '../dialogs/SavePNGWithUnityDlg'
export default OutilCopyWithUnity
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCopyWithUnity (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'Copy', -1, false, false, false, false)
}

OutilCopyWithUnity.prototype = new Outil()

OutilCopyWithUnity.prototype.select = function () {
  // Ici il faut appeler une fonction de callBack pour que copy ne soit appelé que lorsque les données
  // sont prêtes.
  // savePNG est une fonction globale de la page index.html pour la version electron
  new SavePNGWithUnityDlg(this.app, false)
}

OutilCopyWithUnity.prototype.activationValide = function () {
  return Boolean(navigator?.clipboard) && (this.app.listePr.pointeurLongueurUnite !== null)
}
