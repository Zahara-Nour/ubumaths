/*
 * Created by yvesb on 27/12/2016.
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
import NatCal from '../types/NatCal'
export default PaneListeReperes

/**
 *
 * @param {MtgApp} app
 * @param indmax
 * @constructor
 */
function PaneListeReperes (app, indmax) {
  this.app = app
  const list = app.listePr
  // On crée un tableau formé des noms des repères disponibles et un autre formé de pointeurs sur ces repères
  this.tab1 = []
  this.tab2 = []
  for (let i = 0; i <= indmax; i++) {
    const el = list.get(i)
    if (el.estDeNatureCalcul(NatCal.NRepere) && !el.estElementIntermediaire()) {
      this.tab1.push(el.getNom())
      this.tab2.push(el)
    }
  }
}

PaneListeReperes.prototype.getTab = function () {
  const tab = ce('table', {
    cellspacing: 10,
    tabindex: -1 // Pour qu'on ne passe pas dessu pas la touche TAB
  })
  const td = ce('TD', {
    valign: 'top'
  })
  tab.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:120px'
  })
  td.appendChild(caption)
  $(caption).html(getStr('Repere') + ' : ')
  this.select = ce('select', {
    id: 'mtgselect',
    size: 4, // Le nombre de lignes visilbles par défaut
    style: 'width:120px'
  })
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des repères disponibles dans la liste déroulante
  for (let i = 0; i < this.tab1.length; i++) {
    const option = ce('option', {
      class: 'mtgOption',
      value: i
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.tab1[i])
    this.select.appendChild(option)
  }
  return tab
}

PaneListeReperes.prototype.getSelectedRep = function () {
  return this.tab2[this.select.selectedIndex]
}

PaneListeReperes.prototype.selectRep = function (rep) {
  for (let i = 0; i < this.tab1.length; i++) {
    if (this.tab2[i] === rep) {
      $('#mtgselect option:eq(' + i + ')').prop('selected', true)
    }
  }
}
