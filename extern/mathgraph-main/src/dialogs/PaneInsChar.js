/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import CarButton from './CarButton'
import Fonte from '../types/Fonte'
export default PaneInsChar

/**
 * Fonction créant un tableau formé de boutons de caractères associés soit au caractère lui-même soit au
 * code LaTeX de ce caractère
 * @param {string} family  "grec", "mathjs" ou "arrows"
 * @param editor L'éditeur associe dans lequel le code est inséré quand on clique sur le boutons
 * @param dlg Le dialogue propriétaire de l'éditeur
 * @param bLatex true si on insére le code LaTeX du caractère, false si on insère le caractère lui-même
 * @constructor
 */
function PaneInsChar (family, editor, dlg, bLatex) {
  let tabChar, tabCode, tr
  switch (family) {
    case 'grec' :
      tabChar = Fonte.grec
      tabCode = bLatex ? Fonte.grecLatex : tabChar
      break
    case 'math' :
      tabChar = Fonte.math
      tabCode = bLatex ? Fonte.mathLatex : tabChar
      break
    case 'arrows' :
      tabChar = Fonte.arrows
      tabCode = bLatex ? Fonte.arrowsLatex : tabChar
  }
  const nbCarParLigne = 6
  const tab = ce('table', {
    cellspacing: 1,
    style: 'width:60px;height:100px'
  })
  for (let i = 0; i < tabChar.length; i++) {
    const btn = new CarButton(tabChar[i], tabCode[i], editor, dlg)
    if (i % nbCarParLigne === 0) {
      tr = ce('tr')
      tab.appendChild(tr)
    }
    const td = ce('td', {
      style: 'text-align:center;' // Pour que les bouton soient centrés
    })
    tr.appendChild(td)
    td.appendChild(btn.container)
  }
  this.container = tab
}
