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
import ConfirmDlg from '../dialogs/ConfirmDlg'
import { storeFigByCode } from '../kernel/kernelAdd'

export default OutilOpen

/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilOpen (app) {
  Outil.call(this, app, '', 'Open', -1, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilOpen.prototype = new Outil()

/**
 * Lance l'ouverture de la fenêtre de navigation de fichier
 * ATTENTION, cette méthode doit être appelée dans un listener (clic ou clavier) pour que ça fonctionne sur safari/apple
 */
OutilOpen.prototype.select = function () {
  const app = this.app
  // Ajout version 6.4. Il faut arrêter toute macro en cours d'exécution
  app.termineMacroEnCours()
  app.activeOutilCapt() // Ajout version 6.4.1 pour éviter plantages si par ex l'outil rideau est actiF
  if (app.electron) {
    // Pour cet outil ne pas appeler Outil.prototype.select
    // openFile est une fonction globale de la page index.html pour la version electron
    if (app.doc.isDirty) {
      new ConfirmDlg(app, 'AvertDirty', function () {
        openFile() // eslint-disable-line no-undef
      })
    } else {
      openFile() // eslint-disable-line no-undef
    }
  } else {
    const actualBase64Code = app.getBase64Code()
    const callbackOK = function (file) {
      app.fileName = file.name.replace(/\..*$/g, '') // sans l'extension
      app.resetFromFile(file)
    }
    // On a résolu le problème du bouton ouvrir sur iPad qui ne fonctionnait pas
    // quand on ne passait pas par la boîte de dialogue de confirmation de modification
    // de figure en mettant des écouteurs sur l'événement pointerup sur les boutons
    if (app.doc.isDirty) {
      new ConfirmDlg(app, 'AvertDirty', function () {
        app.addInputForOpenDlg('mgj', function (file) {
          storeFigByCode(actualBase64Code)
          callbackOK(file)
        })
      })
    } else {
      app.addInputForOpenDlg('mgj', callbackOK)
    }
  }
}
