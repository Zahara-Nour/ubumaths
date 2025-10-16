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
import SaveImageDlg from 'src/dialogs/SaveImageDlg'
export default OutilSaveJPG
/**
 * Outil servant à enregistrer la figure dans un fichier jpeg
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSaveJPG (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'SaveJPG', -1, false, false, false, false)
}

OutilSaveJPG.prototype = new Outil()

OutilSaveJPG.prototype.select = function () {
  // Ici il faut appeler une fontion de callBack pour que saveJPG ne soit appelé que lorsque les données
  // sont prêtes.
  // saveJPG est une fonction globale de la page index.html pour la version electron
  const app = this.app
  if (app.electron) {
    app.getBase64ImageData('jpeg', { coefMult: app.pref_coefMult }, function (data) { saveJPG(data) }) // eslint-disable-line no-undef
  } else {
    new SaveImageDlg(this.app, 'jpeg')
  }
}
