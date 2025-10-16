/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from 'src/kernel/kernel'
import Outil from './Outil'
import OptionsFigDlg from '../dialogs/OptionsFigDlg'
export default OutilOptionsFig

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilOptionsFig (app) {
  Outil.call(this, app, 'OptionsFig', -1, false, false) // Le dernier false car l'outil n'est pas sélectionnable
}

OutilOptionsFig.prototype = new Outil()

OutilOptionsFig.prototype.select = function () {
  this.oldLanguage = this.app.language
  new OptionsFigDlg(this.app, this.callBackOK.bind(this))
}

OutilOptionsFig.prototype.callBackOK = function () {
  // on redessine les boutons d'outils (du haut et à gauche)
  const app = this.app
  const list = app.listePr
  list.positionne(false, app.dimf)
  list.update(app.svgFigure, app.doc.couleurFond, true)
  // pour le ctrl+z
  this.saveFig()
  // Si par exemple on a changé l'unité d'angle certains outils
  // peuvent être devenus actifs ou inactifs
  app.updateToolsToolBar()
  if (this.oldLanguage !== app.language) {
    // après un changement de langue en version online, les tooltips sont bien mis à jour
    // pour la toolbar du haut mais pas celle de gauche…
    // faut passer en revue tous les boutons de this.app.buttons pour mettre à jour leur propriété tip
    for (const btn of app.buttons) {
      if (btn.toolName && btn.tip) {
        const newTip = getStr(btn.toolName)
        if (newTip) btn.tip = newTip
        // sinon getStr a déjà râlé en console
      }
    }
  }
}
