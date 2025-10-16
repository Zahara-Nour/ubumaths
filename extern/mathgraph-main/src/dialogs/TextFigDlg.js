/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import MtgTextAreaWithCharSpe from './MtgTextAreaWithCharSpe'
export default TextFigDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function TextFigDlg (app) {
  MtgDlg.call(this, app, 'textdlg')
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.textarea = new MtgTextAreaWithCharSpe(app, { cols: 80, rows: 20, wrap: 'off' }, ['grec', 'math', 'arrows'], false, this)
  this.textarea.owner = this
  tr.appendChild(this.textarea)
  const jqta = $(this.textarea)
  jqta.css('overflow-x', 'scroll')
  // On ne peut pas utiliser de style css pour le textarea car sinon il est écrasé par un autre style de jquery
  jqta.css('font-size', '14px')
  jqta.val(app.doc.texteFigure)
  this.create('TextFig', 650)
}

TextFigDlg.prototype = new MtgDlg()

TextFigDlg.prototype.OK = function () {
  this.app.doc.texteFigure = $(this.textarea).val()
  this.destroy()
}
