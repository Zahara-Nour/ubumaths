/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import NatObj from '../types/NatObj'
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import addQueue from 'src/kernel/addQueue'

export default ModifAffFinalDlg

/**
 * Dialogue de Modification d'un CCommentaire ou un CLatex quand il est un objet final et qu'on ne doit pas modifier son contenu
 * @param {MtgApp} app L'application propriétaire
 * @param aff Le CCommentaire à modifier
 * @param callBackOK Fonction de callBack à appeler si on valide par OK
 * @param callBackCancel Fonction de callBack à appeler si on referme sans valider
 * @constructor
 */
function ModifAffFinalDlg (app, aff, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ModifDlg', callBackOK, callBackCancel)
  this.aff = aff
  const tabPrincipal = ce('table', {
    style: 'padding-bottom:100px;'
  })
  const tr = ce('tr')
  this.appendChild(tabPrincipal)
  tabPrincipal.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, aff.alignementHorizontal, aff.alignementVertical)
  let td = ce('td', {
    valign: 'top'
  })
  tabPrincipal.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tabPrincipal.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(aff.taillePolice)
  tabPrincipal.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tabPrincipal.appendChild(td)
  this.paneModeAffichage = new PaneModeAffichage(this, false, aff.effacementFond, aff.encadrement, aff.couleurFond)
  td.appendChild(this.paneModeAffichage.container)
  this.create(aff.estDeNature(NatObj.NCommentaire) ? 'Commentaire' : 'Latex', 500)
}

ModifAffFinalDlg.prototype = new MtgDlg()

// Necessaire de définir onOpen pour que le bouton de choix de couleur soit invisible au démarrage
// au cas où on n'efface pas le fond
ModifAffFinalDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  this.paneModeAffichage.init()
}

ModifAffFinalDlg.prototype.OK = function () {
  const app = this.app
  const aff = this.aff
  const pa = this.paneAlign
  const pma = this.paneModeAffichage

  // On affecte les choix à l'affichage
  aff.encadrement = pma.getStyleEnc()
  aff.effacementFond = pma.getEffFond()
  aff.couleurFond = pma.getColor()
  aff.taillePolice = this.paneTaillePolice.getTaille()
  aff.alignementHorizontal = pa.getHorAlign()
  aff.alignementVertical = pa.getVerAlign()
  aff.determineDependances()
  aff.positionne(false, this.app.dimf)
  aff.setReady4MathJax()
  addQueue(() => aff.reCreateDisplay(app.svgFigure))
  this.callBackOK()
  if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
  this.destroy()
}
