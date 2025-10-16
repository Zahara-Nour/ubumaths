/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import exportHTML from '../kernel/exportHTML'
import $ from 'jquery'

export default ExportHTMLDlg

/**
 * Dialogue d'exportation de la figure en html
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {function} callBack Fonction de callBack à appler après validation
 */
function ExportHTMLDlg (app, callBack) {
  MtgDlg.call(this, app, 'tikzDlg')
  this.callBack = callBack
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('Title'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  let input = ce('input', {
    id: 'inp1',
    type: 'text'
  })
  td.appendChild(input)

  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Aut'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  input = ce('input', {
    id: 'inp2',
    type: 'text'
  })
  td.appendChild(input)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas1 = ce('table')
  let caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('TextHtm1'))
  tabBas1.appendChild(caption)
  tr.appendChild(tabBas1)
  td = ce('td')
  tabBas1.appendChild(td)
  let textarea = ce('textarea', {
    id: 'ta1',
    cols: 60,
    rows: 4
  })
  td.appendChild(textarea)

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas2 = ce('table')
  caption = ce('caption', {
    class: 'mtgcaption'
  })
  $(caption).html(getStr('TextHtm2'))
  tabBas2.appendChild(caption)
  tr.appendChild(tabBas2)
  td = ce('td')
  tabBas2.appendChild(td)
  textarea = ce('textarea', {
    id: 'ta2',
    cols: 60,
    rows: 4
  })
  td.appendChild(textarea)
  // Création de la boîte de dialogue par jqueryui
  this.create('ExportHTML', 550)
}

ExportHTMLDlg.prototype = new MtgDlg()

ExportHTMLDlg.prototype.OK = function () {
  const app = this.app
  let text = exportHTML.text
  const title = $('#inp1').val()
  const aut = $('#inp2').val()
  const txt1 = $('#ta1').val()
  const txt2 = $('#ta2').val()
  const dimf = app.dimf
  const width = parseInt(app.cadre ? app.widthCadre : dimf.x)
  const height = parseInt(app.cadre ? app.heightCadre : dimf.y)
  text = text.replace('*width', width)
  text = text.replace('*height', height)
  text = text.replace('<title>', '<title>' + getStr('HTML'))
  text = text.replace('*title', title)
  text = text.replace('*texte1', txt1)
  text = text.replace('*texte2', txt2)
  text = text.replace('*creeAvec', getStr('CrWith'))
  text = text.replace('*auteur', aut)
  text = text.replace('*figureData', app.getBase64Code())
  this.destroy()
  this.callBack(text)
}
