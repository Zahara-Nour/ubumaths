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
import { getButtonArrow } from '../kernel/kernelAdd'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
export default OutilAddDlg

/**
 * Boîte de dialogue qui apparaît quand on clique sur une icône + située à droite de certaines
 * barres d'outils déroulables et présentant des outils sous forme d'items sur lesquels il faut cliquer
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param outilAdd du type OutilAdd
 * @param {string} title Le titre de la boîte de dialogue
 */
function OutilAddDlg (app, outilAdd, title) {
  MtgDlg.call(this, app, 'OutilAddDlg')
  const self = this
  const tab = ce('table')
  this.appendChild(tab)
  let i = 0
  for (const toolName of outilAdd.toolArray) {
    const tool = app['outil' + toolName]
    const id = 'file' + i++
    if (tool.activationValide() && app.doc.toolDispo(tool.toolIndex) && app.level.toolDispo(tool.toolIndex)) {
      const tr = ce('tr')
      tab.appendChild(tr)
      const btn = getButtonArrow(app, id)
      btn.tool = app['outil' + toolName]
      btn.addEventListener('click', (ev) => {
        self.destroy()
        self.stopEvent(ev)
        // this.tool.select();
        app.selectTool(toolName)
      })
      tr.appendChild(btn)
      const label = ce('label', {
        class: 'labelarrow',
        for: id // Pour quon puisse activer l'outil en cliquant sur le label
      })
      $(label).html(getStr(toolName))
      tr.appendChild(label)
    }
  }
  // Attention : Pour cette boîte de dialogue ne pas appeler create
  const buttons = {}
  buttons[getStr('Fermer')] = function (ev) {
    self.destroy()
    self.stopEvent(ev)
    self.app.activeOutilCapt()
  }

  $('#' + self.id).dialog({
    modal: true,
    title: getStr(title),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.stopEvent(ev)
      self.destroy()
    },
    width: 550,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

OutilAddDlg.prototype = new MtgDlg()
