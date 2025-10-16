/*
 * Created by yvesb on 02/05/2017.
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
export default PaneFreq

/**
 * Fonction créant un panneau de choix de fréquence d'animation
 * Après la création, this.container contient un td contenant la liste de choix de fréquence
 * @constructor
 * @param {number} freqInit La fréquence à sélectionner dans la liste
 * @param {boolean} bFreqMax si true un choix de fréquence maximale est proposé
 */
function PaneFreq (freqInit, bFreqMax) {
  this.bFreqMax = bFreqMax
  const td = ce('td')
  $(td).css('vertical-align', 'top')
  this.container = td
  const caption = ce('caption', {
    class: 'mtgcaption',
    width: '150px'
  })
  $(caption).html(getStr('Freq'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 4 // Le nombre de lignes visibles par défaut
  })
  td.appendChild(this.select)
  const freqs = ['Max', '1/100', '2/100', '3/100', '4/100', '5/100', '1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10',
    '1', '1/1000', '2/1000', '3/1000', '4/1000', '5/1000', '6/1000', '7/1000', '8/1000', '9/1000']
  this.freq = [0, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
    1000, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = 0; i < freqs.length; i++) {
    if ((i !== 0) || bFreqMax) {
      const option = ce('option', {
        class: 'mtgOption'
      })
      if (this.freq[i] === freqInit) option.setAttribute('selected', 'selected')
      $(option).html(freqs[i])
      this.select.appendChild(option)
    }
  }
}

PaneFreq.prototype.getFreq = function () {
  const ind = this.select.selectedIndex
  return this.freq[this.bFreqMax ? ind : ind + 1]
}
