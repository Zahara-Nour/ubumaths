/*
 * Created by yvesb on 12/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import CAffLiePt from '../objets/CAffLiePt'
import PaneNombreDecimales from './PaneNombreDecimales'
import PaneListeReperes from './PaneListeReperes'
import PaneAlignement from './PaneAlignement'
import PaneTaillePolice from './PaneTaillePolice'
import PaneModeAffichage from './PaneModeAffichage'
import StyleEncadrement from '../types/StyleEncadrement'

export default AffichageDlg

/**
 * Dialogue servant à créer un affichage d'équation de droite ou de cercle
 * ou un affichage de coordonnées via une macro-construction
 * @param {MtgApp} app L'application propriétaire
 * @param {string} title titre de la fanêtre
 * @param {VoidCallback} callBackOK Fonction de callBack à appeler si l'utilisateur valide.
 * @param {VoidCallback} callBackCancel Fonction de callBack à appeler si l'utilisateur annule.
 * @param {number} nbdecinit Le nombre de décimales par défaut
 * @constructor
 * @extends MtgDlg
 */
function AffichageDlg (app, title, nbdecinit, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'EqDlg', callBackOK, callBackCancel)
  const tabPrincipal = ce('table')
  let tr = ce('tr')
  let td = ce('td')
  const tabHaut = ce('table')
  const trHaut = ce('tr')
  const tableBas = ce('table')
  this.appendChild(tabPrincipal)
  tabPrincipal.appendChild(tr)
  // La première ligne du tableau contient un tableau formé de deux colonnes : Le choix du repère et le nombre de décimales
  tr.appendChild(tabHaut)
  tabHaut.appendChild(trHaut)
  tabHaut.appendChild(td)
  this.paneListeRep = new PaneListeReperes(app, app.listePr.longueur() - 1)
  td.appendChild(this.paneListeRep.getTab())
  td = ce('td')
  tabHaut.appendChild(td)
  this.paneNbDec = new PaneNombreDecimales(nbdecinit) // 1 déciamle par déafut
  td.appendChild(this.paneNbDec.container)

  // Dans la troisième ligne du tableau principal, un tableau de trois colonnes contenant un panneau de choix de
  // mode d'affichage, un panneau de choix d'alignement et un manneua de choix de taille de police
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneAlign = new PaneAlignement(app, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop)
  tr.appendChild(tableBas)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  td.appendChild(this.paneAlign.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneTaillePolice = new PaneTaillePolice(16)
  tableBas.appendChild(this.paneTaillePolice.container)
  td = ce('td', {
    valign: 'top'
  })
  tableBas.appendChild(td)
  this.paneModeAffichage = new PaneModeAffichage(this, false, false, StyleEncadrement.Sans, app.doc.couleurFond)
  td.appendChild(this.paneModeAffichage.container)
  this.create(title, 550)
}

AffichageDlg.prototype = new MtgDlg()

// Necessaire de définir onOpen pour que le bouton de choix de couleur soit invisible au démarrage
// au cas où on n'efface pas le fond
AffichageDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this)
  this.paneModeAffichage.init()
}

AffichageDlg.prototype.OK = function () {
  const pma = this.paneModeAffichage
  const pa = this.paneAlign
  // On appelle la fonction de callback avec comme paramètres les paramètres d'affichage choisis
  this.callBackOK(this.paneListeRep.getSelectedRep(), this.paneNbDec.getDigits(), this.paneTaillePolice.getTaille(),
    pma.getStyleEnc(), pma.getEffFond(), pma.getColor(), pa.getHorAlign(), pa.getVerAlign())
  this.destroy()
}
