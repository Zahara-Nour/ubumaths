/*
 * Created by yvesb on 08/03/2017.
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
export default PaneTaillePolice

/**
 * Classe représentant un tableau d'une colonne prermettant le choix d'une taille de police
 * this.container contient le tableau proprement dit
 * @param tailleInit La taille initiale à sélectionner dans le tableau
 * @param callBack Fonction de callBac éventuelle à appeler quand on change de sélection
 * @constructor
 */
function PaneTaillePolice (tailleInit, callBack = null) {
  let i, option
  this.callBack = callBack
  const tab = ce('table', {
    cellspacing: 2
  })
  const caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('Taille') + ' :')
  tab.appendChild(caption)
  $(tab).css('border', '1px solid lightgray')
  const td = ce('td')
  tab.appendChild(td)
  this.select = ce('select', {
    size: 5 // Le nombre de lignes visibles par défaut
  })
  const self = this
  this.select.onchange = function () {
    if (self.callBack !== null) self.callBack()
  }
  td.appendChild(this.select)
  for (i = 7; i <= 80; i++) {
    option = ce('option', {
      class: 'mtgOption'
    })
    if (i === tailleInit) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.select.appendChild(option)
  }
  this.container = tab
}

PaneTaillePolice.prototype.getTaille = function () {
  return this.select.selectedIndex + 7
}
