/*
 * Created by yvesb on 15/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'

export default ConfirmDlg

/**
 *
 * @param {MtgApp} app
 * @param {string} messageId
 * @param callBackOK
 * @param callBackNo
 * @constructor
 */
function ConfirmDlg (app, messageId, callBackOK, callBackNo) {
  MtgDlg.call(this, app, 'confirmDlg')
  const label = ce('label')
  $(label).html(getStr(messageId))
  this.appendChild(label)
  const self = this
  // Création de la boîte de dialogue par jqueryui
  const buttons = {}
  buttons[getStr('Oui')] = function (ev) {
    if (callBackOK) callBackOK()
    self.stopEvent(ev)
    self.destroy()
  }
  buttons[getStr('Non')] = function (ev) {
    if (callBackNo) callBackNo()
    self.stopEvent(ev)
    self.destroy()
  }

  // Attention : Pour cette boîte de dialogue ne pas appeler create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr(''),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      if (callBackNo) callBackNo()
      self.stopEvent(ev)
      self.destroy()
    },
    width: 500,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

ConfirmDlg.prototype = new MtgDlg()
