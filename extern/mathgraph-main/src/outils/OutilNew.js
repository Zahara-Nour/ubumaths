/*
 * Created by yvesb on 26/12/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NewFigDlg from '../dialogs/NewFigDlg'
import ConfirmDlg from '../dialogs/ConfirmDlg'
import { uniteAngleDegre } from 'src/kernel/kernel'
import { storeFigByCode } from '../kernel/kernelAdd'
export default OutilNew
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilNew (app) {
  Outil.call(this, app, 'New', -1, false, true, app.newFig)
}

OutilNew.prototype = new Outil()

OutilNew.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.termineMacroEnCours() // Ajout version 6.4.1
  app.activeOutilCapt() // Ajout version 6.4.1 pour éviter plantages si par ex l'outil rideau est actiF

  // On regarde si on est en mode electron. Si oui on avertit si la figure n'a pas été sauvegardée
  const actualBase64Code = app.getBase64Code()
  if (app.doc.isDirty) {
    new ConfirmDlg(app, 'AvertDirty', function () {
      if (app.level === app.levels[0]) {
        storeFigByCode(actualBase64Code)
        app.fileName = ''
        app.setNewfigWithUnity(uniteAngleDegre)
      } else {
        new NewFigDlg(app, function () {
          storeFigByCode(actualBase64Code)
          app.fileName = ''
          app.activeOutilsDem()
          app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
          // Si on est dans la version electron on remet à zéro le document
          if (app.electron) {
            // resetDocument est une fonction de la page index.html de la version electron
            resetDocument() // eslint-disable-line no-undef
          }
          app.gestionnaire.initialise()
        }, function () {
          app.activeOutilCapt()
        })
      }
    })
  } else {
    new NewFigDlg(app, function () {
      app.fileName = ''
      app.activeOutilsDem()
      app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
      // Si on est dans la version electron on remet à zéro le document
      if (app.electron) {
        // resetDocument est une fonction de la page index.html de la version electron
        resetDocument() // eslint-disable-line no-undef
      }
      app.gestionnaire.initialise()
    }, function () {
      app.activeOutilCapt()
    })
  }
}
