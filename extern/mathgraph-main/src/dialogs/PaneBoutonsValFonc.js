/*
 * Created by yvesb on 02/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import $ from './jQuery-ui'
// import 'jquery-ui'
import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import ChoixValeurDlg from './ChoixValeurDlg'
import NatCal from '../types/NatCal'
import ListeFonctionsDlg from './ListeFonctionsDlg'
export default PaneBoutonsValFonc

/**
 * Fonction renvoyant un élément de tableau tr formé d'une première colonne vide, une deuxième colonne qui contient
 * deux boutons : A gauche un bouton de choix de valeur et à droite un bouton de choix de fonction prédéfinie
 * @param {MtgApp} app L'application propriétaire
 * @param dlg Le dialogue propriétaire
 * @param input Le input associé : quand l'utilisateur valide après avoir cliqué sur le bouton Valeurs ou sur le bouton
 * fonctions, le choix qu'il a fait est inséré dans le input au point d'insertion
 * @param reel true si ces boutons servent à éditer une valeur réelle, false pour une valeur complexe
 * @param indmax L'indice maxi des éléments que l'on affiche quand on clique sur le bouton Valeurs
 * @param bEmptyColFirst Si true on rajoute un td vide au début du tr renvoyé
 * @returns {Element}
 * @constructor
 */
function PaneBoutonsValFonc (app, dlg, input, reel, indmax, bEmptyColFirst = true) {
  this.app = app
  this.dlg = dlg
  this.input = input
  this.reel = reel
  this.indmax = indmax
  const self = this
  const tr = ce('tr')
  // Une première colonne vide pour s'aligne à droite du label précédent le input au-dessus
  if (bEmptyColFirst) {
    const td = ce('td')
    tr.appendChild(td)
  }
  const td = ce('td')
  tr.appendChild(td)
  const btnValue = ce('button', {
    tabindex: -1
  })
  btnValue.onclick = function () { self.onBtnValueClick() }
  $(btnValue).html(getStr('Valeurs'))
  td.appendChild(btnValue)
  const btnFunction = ce('button', {
    tabindex: -1,
    style: 'margin-left:5px'
  })
  btnFunction.onclick = function () {
    self.onBtnFunctionClick()
  }
  $(btnFunction).html(getStr('Fonctions'))
  td.appendChild(btnFunction)
  // Ajout version 6.7 pour pouvoir associer un même panneau aux différents éditeurs d'une matrice
  tr.associeA = function (input) {
    this.owner.input = input
  }
  tr.owner = this
  return tr
}

PaneBoutonsValFonc.prototype.onBtnValueClick = function () {
  new ChoixValeurDlg(this.app, this.reel ? NatCal.NTteValOuFoncR : NatCal.NTteValROuCOuFoncROuC, this.input, this.indmax,
    false, null)
}

PaneBoutonsValFonc.prototype.onBtnFunctionClick = function () {
  new ListeFonctionsDlg(this.app, this.input, this.reel)
}
