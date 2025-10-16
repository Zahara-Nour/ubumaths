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
import { addImg, ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
export default PaneAlignement

/**
 * Classe représentant un tableau de deux lignes contenant sur une première ligne les 3 choix possibles d'alignemnt
 * horizontal (0 à 2) et sur une deuxième ligne les 3 choix possibles d'alignement vertical (3 à 5)
 * this.container contient le tableau proprement dit
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param alignHor L'alignement horizontal coché à la création
 * @param alignVer L'alignement vertical coché à la création
 */
function PaneAlignement (app, alignHor, alignVer) {
  let tr, td, input, i, ar, tabver, trver
  const tab = ce('table')
  const caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('Align') + ' :')
  tab.appendChild(caption)
  $(tab).css('border', '1px solid lightgray')
  tr = ce('tr')
  tab.appendChild(tr)
  ar = ['AlignementHorGauche', 'AlignementHorCentre', 'AlignementHorDroit']
  for (i = 0; i < 3; i++) {
    td = ce('td')
    tr.appendChild(td)
    tabver = ce('table')
    td.appendChild(tabver)
    trver = ce('tr')
    tabver.appendChild(trver)
    addImg(trver, ar[i] + '.gif', { height: null, width: null })
    trver = ce('tr')
    tabver.appendChild(trver)
    input = ce('input', {
      id: 'radiohor' + i,
      type: 'radio',
      name: 'grouphor'
    })
    tabver.appendChild(input)
    // Les alignements verticaux vont de 0 à 2
    if (i === alignHor) input.setAttribute('checked', true)
  }
  tr = ce('tr')
  tab.appendChild(tr)
  ar = ['AlignementVertHaut', 'AlignementVertCentre', 'AlignementVertBas']
  for (i = 0; i < 3; i++) {
    td = ce('td')
    tr.appendChild(td)
    tabver = ce('table')
    td.appendChild(tabver)
    trver = ce('tr')
    tabver.appendChild(trver)
    addImg(trver, ar[i] + '.gif', { width: 0, height: 0 })
    trver = ce('tr')
    tabver.appendChild(trver)
    input = ce('input', {
      id: 'radiover' + String(i),
      type: 'radio',
      name: 'groupver'
    })
    tabver.appendChild(input)
    // Les alignements verticaux vont de 0 à 2
    if (i === alignVer) input.setAttribute('checked', true)
  }
  this.container = tab
}

/**
 * Fonction renvoyant un entier correspondant à l'alignement horizontal choisi
 * @returns {number}
 */
PaneAlignement.prototype.getHorAlign = function () {
  for (let i = 0; i < 3; i++) {
    if ($('#' + 'radiohor' + i).prop('checked')) return i
  }
}

/**
 * Fonction renvoyant un entier correspondant à l'alignement vertical choisi
 * @returns {number}
 */
PaneAlignement.prototype.getVerAlign = function () {
  for (let i = 0; i < 3; i++) {
    if ($('#' + 'radiover' + i).prop('checked')) return i
  }
}
