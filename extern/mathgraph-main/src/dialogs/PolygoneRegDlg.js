/*
 * Created by yvesb on 29/04/2017.
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
import AvertDlg from './AvertDlg'
export default PolygoneRegDlg

/**
 *
 * @param {MtgApp} app
 * @param nbSommets
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function PolygoneRegDlg (app, nbSommets, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'LieuDlg', callBackOK, callBackCancel)
  this.nbSommets = nbSommets
  const self = this
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('NbSommets'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = ce('input', {
    id: 'mtginput',
    type: 'text'
  })
  input.size = 4
  td.appendChild(input)
  input.onkeyup = function (ev) {
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.create('PolygoneReg', 450)
}

PolygoneRegDlg.prototype = new MtgDlg()

PolygoneRegDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}

PolygoneRegDlg.prototype.OK = function () {
  const app = this.app
  const nbSommets = parseInt($('#mtginput').val())
  if (nbSommets < 3 || nbSommets > 100 || isNaN(nbSommets)) {
    new AvertDlg(app, 'Incorrect', function () {
      $('#mtgInput').focus()
    })
  } else {
    this.nbSommets.setValue(nbSommets)
    this.destroy()
    this.callBackOK()
  }
}
