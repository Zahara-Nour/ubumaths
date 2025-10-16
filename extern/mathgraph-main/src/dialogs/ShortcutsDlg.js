/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { getShortcuts } from 'src/addShortcuts'
import { ce, ceIn } from 'src/kernel/dom'

import MtgDlg from './MtgDlg'
import { getStr } from '../kernel/kernel'

export default ShortcutsDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends MtgDlg
 */
function ShortcutsDlg (app) {
  MtgDlg.call(this, app, 'shortcutsdlg')
  const self = this
  const tab = ce('table')
  this.appendChild(tab)
  const shortcuts = getShortcuts()
  for (const { key, modifiers, desc } of shortcuts) {
    const tr = ceIn(tab, 'tr')
    const td1 = ceIn(tr, 'td')
    td1.innerText = modifiers.join('+') + (modifiers.length > 0 ? '+' : '') + key
    const td2 = ceIn(tr, 'td')
    td2.style.paddingLeft = '10px'
    td2.innerText = desc
  }

  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = [{
    text: getStr('Fermer'),
    id: 'btnOK',
    click: function (ev) {
      self.onClose(ev)
      self.stopEvent(ev)
    }
  }]

  // Cette boîte de dialogue n'a qu'un bouton : On n'appelle pas create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('Shortcuts'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.onClose(ev)
    },
    width: 650,
    closeOnEscape: false,
    // On affiche la boîte de dialogue sur le div parent de l'application en haut et à droite
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

ShortcutsDlg.prototype = new MtgDlg()
