/*
 * Created by yvesb on 16/04/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
export default FigParCodeDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function FigParCodeDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'FigParCodeDlg', callBackOK, callBackCancel)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const label = ce('label')
  $(label).html(getStr('FigParCode'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const textarea = ce('textarea', {
    id: 'base64',
    cols: 80,
    rows: 20,
    style: 'font-size:13px;'
  })
  tr.appendChild(textarea)
  this.create('Base64', 650)
}

FigParCodeDlg.prototype = new MtgDlg()

FigParCodeDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'base64')
}

FigParCodeDlg.prototype.OK = function () {
  const app = this.app
  app.setFigByCode($('#base64').val())
  this.destroy()
  this.callBackOK()
}
