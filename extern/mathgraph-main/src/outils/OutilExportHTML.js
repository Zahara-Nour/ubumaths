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
import ExportHTMLDlg from 'src/dialogs/ExportHTMLDlg'
import DisplayCodeDlg from 'src/dialogs/DisplayCodeDlg'
export default OutilExportHTML
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilExportHTML (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'ExportHTML', -1, false, false, false, false)
}

OutilExportHTML.prototype = new Outil()

OutilExportHTML.prototype.select = function () {
  // Ici il faut appeler une fontion de callBack pour que savePNG ne soit appelé que lorsque les données
  // sont prêtes.
  // copyTikz est une fonction globale de la page index.html pour la version electron
  const app = this.app
  if (app.electron) {
    new ExportHTMLDlg(app, function (code) {
      saveHTML(code) // eslint-disable-line no-undef
      // SaveHTML est une fonction globale de index.htm pour la version electron
    })
  } else {
    new ExportHTMLDlg(app, function (code) {
      new DisplayCodeDlg(app, code, 'HTML')
    })
  }
}
