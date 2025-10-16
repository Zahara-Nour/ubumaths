/*
 * Created by yvesb on 12/02/2017.
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
export default TagDlg

/**
 * Dialogue d'affectation d'un tag à un objet graphique'
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {CElementGraphique} el Objet dont le tag doit être changé
 * @param {function} callBackOK Fonction de callBack à appeler quand on valide par OK
 */
function TagDlg (app, el, callBackOK) {
  MtgDlg.call(this, app, 'TagDlg', callBackOK)
  const self = this
  this.el = el
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).text(getStr('tag') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = ce('input', {
    id: 'inputtag',
    size: 16
  })
  td.appendChild(input)
  input.onkeyup = function (ev) {
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  $(input).val(el.tag)
  this.create('tag', 400)
}

TagDlg.prototype = new MtgDlg()

TagDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'inputtag')
}

TagDlg.prototype.OK = function () {
  const app = this.app
  const newTag = $('#inputtag').val()
  const doc = this.app.doc
  const list = doc.listePr
  if (newTag !== '') {
    if (list.hasElementOfTag(newTag, this.el)) {
      new AvertDlg(app, getStr('tagErr'))
      $('#taginput').focus()
      return
    }
  }
  list.replaceLatexTagUse(this.el.tag, newTag) // Pour remplacer dans les affichages LaTeX les codes LaTeX
  // du type \Lat{oldTag} par \Lat{newTag}
  this.el.tag = newTag
  this.callBackOK()
  this.destroy()
}
