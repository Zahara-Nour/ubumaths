/*
 * Created by yvesb on 23/04/2025.
 */
import { ce, ceIn } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import { getStr } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import AvertDlg from './AvertDlg'

export default FusionConstDlg

function FusionConstDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'FusionConstDlg', callBackOK, callBackCancel)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ceIn(tabPrincipal, 'tr')
  const label = ceIn(tr, 'label')
  $(label).html(getStr('FusionConstDlg1'))
  tr = ceIn(tabPrincipal, 'tr')
  const td = ceIn(tr, 'td')
  // Le select qui va contenir les noms des constructions de la figure
  this.select = ceIn(td, 'select', {
    size: 12, // Le nombre de lignes visibles
    style: 'width:220px;overflow:auto',
    multiple: 'multiple' // On permet de sélectionner deux objets pour reclasser avant ou après un objet donné
  })
  // On met dans un tableau les noms de toutes les constructions implémentées dans la figure
  const tabName = []
  const list = app.listePr
  list.col.forEach((el) => {
    if (el.estDeNature(NatObj.NImpProto)) {
      const name = el.nomProto
      if (!tabName.includes(name)) tabName.push(name)
    }
  })
  tabName.forEach((name) => {
    const option = ceIn(this.select, 'option')
    $(option).html(name)
  })
  const self = this
  // Attention : Pour cette boîte de dialogue ne pas appeler create car boutons personnalisés
  const buttons = {}
  buttons[getStr('Fusionner')] = function (ev) {
    const options = self.select.options
    let nbselect = 0
    for (let i = 0; i < options.length; i++) {
      if ($(options[i]).prop('selected')) nbselect++
    }
    if (nbselect) {
      for (let i = 0; i < options.length; i++) {
        if ($(options[i]).prop('selected')) {
          app.listePr.fusionImpConstByName(app, options[i].text)
        }
      }
      self.destroy()
      self.stopEvent(ev)
      self.callBackOK()
    } else {
      new AvertDlg(app, 'ErrSelect')
    }
  }
  buttons[getStr('Cancel')] = function (ev) {
    self.destroy()
    self.stopEvent(ev)
    self.callBackCancel()
  }

  $('#' + this.id).dialog({
    modal: true,
    title: getStr('Fusionner'),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    buttons,
    close: function (ev) {
      self.destroy()
      self.stopEvent(ev)
      self.callBackCancel()
    },
    width: 600,
    closeOnEscape: false,
    // On centre la boîte de dialogue sur le div parent de l'application
    position: { my: 'center', at: 'center', of: this.app.svg.parentElement }
  })
}

FusionConstDlg.prototype = new MtgDlg()
