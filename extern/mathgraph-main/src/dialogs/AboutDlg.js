/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { ce, ceIn } from 'src/kernel/dom'

import MtgDlg from './MtgDlg'
import { getStr } from '../kernel/kernel'
import { version } from '../../package.json'

export default AboutDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends MtgDlg
 */
function AboutDlg (app) {
  MtgDlg.call(this, app, 'aboutdlg')
  const self = this
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ceIn(tabPrincipal, 'tr')
  let td = ceIn(tr, 'td')
  const label = ceIn(td, 'label', {
    class: 'labelSmall',
    disabled: true,
    style: 'color:blue;'
  })
  label.innerHTML = `<strong>MathGraph32 JavaScript version ${version}. Software for creating and animating dynamic mathematics figures.</br>
Copyright (C) 2017 Yves Biton (France) http://mathgraph32.org</br></strong></br>
`
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ceIn(tr, 'td')
  const ta = ceIn(td, 'textarea', {
    style: 'width:620px;height:400px;overflow:auto;',
    disabled: true
  })
  $(ta).val(
`Author and developpement : Yves Biton (France).
Translations of documentation and text files :
  English : Yves Biton
  Spanish : Luis Belcredi (Uruguay)
Icons :
  Sébastien Cogez
  with the help of Gartoon Gnome Icon Theme Created by Zeus (zeussama@yahoo.com)
    Icon website http://zeus.qballcow.nl
  Co-designer: La Mula Francis
  People who donate icons :
    La Mula Francis : Lot's of stock icons {mulafrancis@terra.com}
    Tiago Bortoletto : Open Office Impress
    James Birkett : Open Office Math
    Ian Megibben : Houdini and Maya

This program is free software: you can redistribute it and/or modify
it under the terms of the Affero GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see http://www.gnu.org/licenses.
${app.electron
  ? '\nMathGraph32 JavaScript is built using electron : https://github.com/electron/electron/blob/master/LICENSE'
  : ''
}
MathGraph32 JavaScript uses the following librairies :
  MathJax version 3 : https://github.com/mathjax/MathJax/blob/master/LICENSE
  jquery
  jquery-ui
  jquery-textrange
  spectrum-colorpicker : https://github.com/bgrins/spectrum/blob/master/LICENSE
  mathjs : https://mathjs.org/
  jstree : https://www.jstree.com/
  binary-parser : http://jsfromhell.com/classes/binary-parser
  file-saver : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
  Brython : https://brython.info/index.html (for the Python code)
  ace-editor : https://ace.c9.io/
`
  )
  $(ta).textrange('setcursor', 0)
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = [
    {
      text: getStr('Fermer'),
      id: 'btnOK',
      click: function (ev) {
        self.onClose(ev)
        self.stopEvent(ev)
      }
    }
  ]

  // Cette boîte de dialogue n'a qu'un bouton : On n'appelle pas create
  $('#' + self.id).dialog({
    modal: true,
    title: getStr('About'),
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

AboutDlg.prototype = new MtgDlg()
