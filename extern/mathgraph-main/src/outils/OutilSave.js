/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from 'src/kernel/kernel'
import AvertDlg from 'src/dialogs/AvertDlg'
import SaveDlg from 'src/dialogs/SaveDlg'
export default OutilSave
/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSave (app) {
  Outil.call(this, app, 'Save', -1, false, false, app.save) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilSave.prototype = new Outil()

OutilSave.prototype.select = function () {
  const app = this.app
  try {
    if (app.electron) {
      if (app.functionOnSave) {
        app.functionOnSave()
      } else {
        saveForIcon() // eslint-disable-line no-undef
        app.doc.setDirty(true, false)
        app.activeOutilCapt()
      } // saveForIcon est une fonction globale de la page index.html pour la version electron
    } else {
    // Si on est en mode affichage (et pas édition) de la ressource éditable, app.preview vaut true et app.functionOnSave peut être nullish
    // (si une figure mathgraph éditable se retrouve dans une séquence élève, on devrait avoir preview à true
    // et functionOnSave fourni pour récupérer le résultat et le sauvegarder)
      const isExercicePreview = app.estExercice && app.preview // c'est l'affichage d'un exo de construction (pas son édition)
      if (isExercicePreview) {
      // pour les exos de construction en preview (affichage et pas modif), le bouton save fait un truc en plus avant la sauvegarde
      // il évalue la construction, et lorsqu'il manque des trucs affiche un message et arrête là
      // sinon ça continue normalement
      // Pour un exercice de construction, s'il manque des objest ayant le nom d'objets à construire, on refuse d'enregistrer
        if (app.objectConstructed()) {
          let mes2 = ''
          let mes1 = ''
          // Si on est dans un composant MathGraph32 de la bibli ou de LaboMep et si l'élève est en train de compléter une figure
          const missingTypes = app.getMissingTypes()
          const bMissingTypes = missingTypes.length !== 0
          if (bMissingTypes) {
            mes1 = getStr('aconst') + ' '
            for (let k = 0; k < missingTypes.length; k++) {
              mes1 += missingTypes[k]
              if (k !== missingTypes.length - 1) mes1 += ', '
            }
          }
          const missingNames = app.getMissingNames()
          const bMissingNames = missingNames.length !== 0
          if (bMissingNames) {
            mes2 = getStr('anom') + ' '
            for (let k = 0; k < missingNames.length; k++) {
              mes2 += missingNames[k]
              if (k !== missingNames.length - 1) mes2 += ', '
            }
          }
          // S'il manque des objets de type demandé ou si des objets n'ont pas été nommés, on refuse d'enregistrer
          // et on affiche un message d'avertissement
          if (bMissingTypes || bMissingNames) {
            let mes = bMissingTypes ? mes1 : ''
            if (bMissingNames) {
              if (missingTypes) mes += '</br>'
              mes += mes2
            }
            new AvertDlg(app, mes)
            // On ne sauvegarde pas car par exemple l'élève a pu bien construire un objet mais oublier de le nommer
            // d'où le return
            return
          }
        } else {
        // On avertit qu'aucun objet n'a été construit et on n'enregistre pas la figure d'où le return
          new AvertDlg(app, 'none')
          return
        }
      }

      // on passe à la sauvegarde "ordinaire", mais on veut aussi passer là pour le message OK|KO des exos de construction
      if (app.functionOnSave || isExercicePreview) {
        const result = app.getResult()
        const sendResult = app.functionOnSave
          ? () => app.functionOnSave(result)
          : () => undefined
        if (app.avertOnSave) {
          const msgId = app.estExercice
            ? (result.score === 1 ? 'res' : 'notres')
            : 'saved'
          const msg = getStr(msgId)
          new AvertDlg(app, msg, sendResult)
          // sendResult sera appelé au clic sur le bouton fermer du dialog précédent
        } else {
          sendResult()
        }
      } else {
      // on affiche le dialog qui va demander un nom et où mettre ça sauf si on n'est pas dans electron
        // et on a déjà chargé une figure via ouverture de fichier
        if (app.fileName) {
          app.doc.saveAs(app.fileName)
        } else {
          new SaveDlg(app)
        }
      }
    }
  } catch (error) {
    console.error(error)
    // @todo afficher un truc à l'utilisateur pour lui dire que ça a planté
  }
}
