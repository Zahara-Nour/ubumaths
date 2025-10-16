/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import 'jquery-textrange'

export default CarButton

/**
 * Bouton destiné à figure dans un panneau de choix de caractères spéciaux
 * @param {string} char Le caractère qui sera inséré dans editor quand on clique sur le bouton
 * @param code Le code associé au caractère
 * @param editor L'éditeur associé dans lequel est inséré le caractère quand on clique sur le bouton
 * @param dlg Le dialogue propriétaire de l'éditeur editor
 * @constructor
 */
function CarButton (char, code, editor, dlg) {
  const self = this
  this.char = char
  this.code = code
  this.editor = editor
  this.dlg = dlg
  const btn = ce('button', {
    class: 'charbutton',
    style: 'font-size:10pt;padding:0px;'
  })
  $(btn).html(char)
  btn.onclick = function () {
    const st = $(self.editor).val()
    const deb = $(self.editor).textrange('get', 'start')
    const fin = $(self.editor).textrange('get', 'end')
    $(self.editor).val(st.substring(0, deb) + self.code + st.substring(fin))
    $(self.editor).textrange('setcursor', deb + self.code.length)
    if (self.editor.demarquePourErreur) self.editor.demarquePourErreur()
    if (self.dlg.updatePreview) self.dlg.updatePreview()
  }
  this.container = btn
}
