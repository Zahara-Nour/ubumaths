/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CodeTikzDlg from 'src/dialogs/CodeTikzDlg'
import DisplayCodeDlg from 'src/dialogs/DisplayCodeDlg'
export default OutilCodeTikz
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCodeTikz (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'SaveTikz', -1, false, false, false, false)
}

OutilCodeTikz.prototype = new Outil()

OutilCodeTikz.prototype.select = function () {
  // Ici il faut appeler une fontion de callBack pour que savePNG ne soit appelé que lorsque les données
  // sont prêtes.
  // copyTikz est une fonction globale de la page index.html pour la version electron
  const app = this.app
  new CodeTikzDlg(app, function (code) {
    new DisplayCodeDlg(app, code, 'Tikz')
  })
}
