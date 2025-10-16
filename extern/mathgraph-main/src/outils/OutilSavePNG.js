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
export default OutilSavePNG
/**
 * Outil servant à renregistrer la figure dans un fichier png
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSavePNG (app) {
  Outil.call(this, app, 'SavePNG', -1, false, false, false, false)
}

OutilSavePNG.prototype = new Outil()

OutilSavePNG.prototype.select = function () {
  // Ici il faut appeler une fontion de callBack pour que savePNG ne soit appelé que lorsque les données
  // sont prêtes.
  // savePNG est une fonction globale de la page index.html pour la version electron
  const app = this.app
  if (app.electron) {
    app.getBase64ImageData('png', { coefMult: app.pref_coefMult }, function (data) { savePNG(data) }, app.pref_coefMult, 1) // eslint-disable-line no-undef
  } else {
    new SaveImageDlg(this.app, 'png')
  }
}
