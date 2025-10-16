/*
 * Created by yvesb on 04/01/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import EditeurNomCalcul from './EditeurNomCalcul'
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from '../dialogs/dom'
export default NomMesureDlg

// Version 7.0 : Cette boîte de dialogue est aussi utilsiée pour créer une matrice de coordonnées de points.
// On ajoute un dernier paramètre facultatif intitule qui sert indiquer ce qu'on met dans le label
/**
 * Fonction appelée pour valider le nom d'une mesure. Si bListeRep est true, alors la boîte de dialogue contient
 * une liste de repères parmis lesquels l'utilisateur doit chosiir, ind étabt le dernier indice permis pour les repères
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param title Le titre de la boîte de dialogue
 * @param callBackOK Fonction appelée si l'utilisateur clique sur OK :
 * Si bListeRep est absent ou false : un seul paramètre pour la fonction qui est la chaîne entrée dans l'éditeur
 * Sinon un deuxième paramèter qui contient le repère choisi.
 * @param callBackCancel Fonction à appeler si l'utilisateur annule.
 * @param bListeRep {boolean} true si l'utilisateur doit choisir un repère dans une liste
 * @param {string} intitule Contient la chaîne à afficher dans le label quand on ne crée pas une mesure
 * (création d'une matrice par coordonnées de points cliqués)
 */
function NomMesureDlg (app, title, callBackOK, callBackCancel, bListeRep = false, intitule = 'NomMesure') {
  MtgDlg.call(this, app, 'nomMesuredlg', callBackOK, callBackCancel)
  this.bListeRep = bListeRep
  const self = this
  const tab = ce('table')
  this.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  const td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr(intitule) + ' : ')
  td.appendChild(label)
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  // So on est en train de créer une matrice de coordonnées ou une droite de régression
  // on propose un nom par défaut pour la matrice
  if (arguments.length >= 6) $(this.inputName).val(app.listePr.genereNomPourCalcul('mat', false))

  if (bListeRep) {
    tr = ce('tr')
    tab.appendChild(tr)
    this.paneListeRep = new PaneListeReperes(app, app.listePr.longueur() - 1)
    tr.appendChild(this.paneListeRep.getTab())
  }

  this.inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }

  this.editeurName = new EditeurNomCalcul(app, true, this.inputName)
  this.create(title, 400)
}

NomMesureDlg.prototype = new MtgDlg()

NomMesureDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputName)
}

NomMesureDlg.prototype.onCancel = function () {
  this.destroy()
  this.callBackCancel()
}

NomMesureDlg.prototype.OK = function () {
  // Remplacé par la ligne suivante. Si un message d'avertissement est en cours, on ne tient pas compte de OKs
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  const st = $(this.inputName).val()
  if (this.editeurName.validate()) {
    this.destroy()
    if (this.bListeRep) this.callBackOK(st, this.paneListeRep.getSelectedRep())
    else this.callBackOK(st)
  }
}
