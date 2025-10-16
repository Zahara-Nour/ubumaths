/*
 * Created by yvesb on 12/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import $ from './jQuery-ui'
import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
export default PaneNombreDecimales

/**
 * Classe représentant un tableau d'unecolonne permettant le choix du nombre de déciamles d'un affichage de valeur
 * this.container contient le tableau proprement dit
 * @param nbDecInit Le nombre de décimales initial à sélectionner dans le tableau
 * @param callBack fonction de callBack éventuelle à appeler lorsqu'on change le nombre de décimales (si présent)
 * @constructor
 */
function PaneNombreDecimales (nbDecInit, callBack = null) {
  let i
  this.callBack = callBack
  const tab = ce('table', {
    cellspacing: 2
  })
  const caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('Decimales'))
  tab.appendChild(caption)
  $(tab).css('border', '1px solid lightgray')
  const td = ce('td', {
    valign: 'top'
  })
  $(td).css('text-align', 'center')
  tab.appendChild(td)
  this.select = ce('select', {
    size: 5 // Le nombre de lignes visibles par défaut
  })
  td.appendChild(this.select)
  const self = this
  this.select.onchange = function () {
    if (self.callBack !== null) self.callBack()
  }
  // Modifié version 6.8.0 : On passe à 16 décimales possibles
  for (i = 0; i <= 16; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    if (i === nbDecInit) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.select.appendChild(option)
  }
  this.container = tab
}
PaneNombreDecimales.prototype.getDigits = function () {
  return this.select.selectedIndex
}
