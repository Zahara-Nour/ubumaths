/*
 * Created by yvesb on 22/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { cens } from 'src/kernel/dom'
import LineStyleButtonForDlg from './LineStyleButtonForDlg'
import constantes from '../kernel/constantes'

export default LineStylePanel

/**
 *
 * @param {MtgApp} app
 * @param styleinit
 * @constructor
 */
function LineStylePanel (app, styleinit) {
  this.app = app
  this.g = cens('g')
  this.lineStyleButtons = []
  const tabls = constantes.tableStyleTrait
  for (let i = 0; i < tabls.length; i++) {
    const c = tabls[i]
    this.lineStyleButtons.push(new LineStyleButtonForDlg(app, this, c[0], c[1], i))
  }
  this.style = styleinit // Style de trait continu
  this.select(styleinit)
}

LineStylePanel.prototype.select = function (style) {
  this.style = style
  const tab = this.lineStyleButtons
  for (let i = 0; i < tab.length; i++) {
    const btn = tab[i]
    const isActivated = btn.isActivated
    const isTarget = (btn.style === style)
    if (isTarget) {
      if (!isActivated) btn.activate(true)
    } else {
      if (isActivated) btn.activate(false)
    }
  }
}
