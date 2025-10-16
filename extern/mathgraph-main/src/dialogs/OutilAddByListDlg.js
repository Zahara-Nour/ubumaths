/*
 * Created by yvesb on 14/04/2017.
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
export default OutilAddByListDlg

/**
 * Boîte de dialogue qui apparaît quand on clique sur une icône + située à droite de certaines
 * barres d'outils déroulables et présentant un liste d'outils. Utilisé pour la création de macros.
 * @param {MtgApp} app L'application propriétaire
 * @param outilAdd du type OutilAdd
 * @param {string} title Le titre de la boîte de dialogue
 * @constructor
 */
function OutilAddByListDlg (app, outilAdd, title) {
  MtgDlg.call(this, app, 'OutilAddByListDlg')
  const self = this
  this.tools = []
  this.outilAdd = outilAdd
  const tab = ce('table')
  this.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  this.select = ce('select', {
    size: 10, // Le nombre de lignes visibles par défaut
    style: 'width:400px'
  })
  tr.appendChild(this.select)
  const arr = outilAdd.toolArray
  let k = 0
  for (let i = 0; i < arr.length; i++) {
    const tool = app['outil' + arr[i]]
    if (tool.activationValide() && app.doc.toolDispo(tool.toolIndex) && app.level.toolDispo(tool.toolIndex)) {
      const option = ce('Option')
      this.tools.push(tool)
      if (k === 0) option.setAttribute('selected', 'selected')
      $(option).html(getStr(arr[i]))
      option.ondblclick = function () { self.OK() }
      this.select.appendChild(option)
      k++
    }
  }
  this.create(title, 500)
}

OutilAddByListDlg.prototype = new MtgDlg()

OutilAddByListDlg.prototype.OK = function () {
  this.tools[this.select.selectedIndex].select()
  this.destroy()
}
