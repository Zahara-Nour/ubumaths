/*
 * Created by yvesb on 18/04/2017.
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
import { getMtgInput } from './dom'
import AvertDlg from './AvertDlg'
import DataOutputStream from '../entreesSorties/DataOutputStream'
import { saveAs } from 'file-saver'
import $ from 'jquery'
export default SaveConstDlg

/**
 *
 * @param {MtgApp} app
 * @param proto
 * @constructor
 */
function SaveConstDlg (app, proto) {
  MtgDlg.call(this, app, 'SaveConstDlg')
  this.proto = proto
  const self = this
  const tabPrincipal = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tabPrincipal)
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  const label = ce('label')
  $(label).html(getStr('saveDlg1'))
  div.appendChild(label)
  this.input = getMtgInput({
    id: 'mtginput'
  })
  div.appendChild(this.input)
  this.input.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.create('SaveConst', 550)
}

SaveConstDlg.prototype = new MtgDlg()

SaveConstDlg.prototype.OK = function () {
  const ch = $('#mtginput').val()
  // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
  if ((ch === '') || ch.match(/\W/)) {
    this.input.marquePourErreur()
    new AvertDlg(this.app, 'NomFichierErr', function () {
      $('#mtginput').focus()
    })
  }
  const oups = new DataOutputStream()
  this.proto.write(oups)
  const ba = oups.ba
  const len = ba.length
  const buffer = new ArrayBuffer(ba.length)
  const dataView = new DataView(buffer)
  for (let i = 0; i < len; i++) dataView.setUint8(i, ba[i])
  saveAs(new Blob([buffer], { type: '' }), ch + '.mgc')
  this.destroy()
}

SaveConstDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'mtginput')
}
