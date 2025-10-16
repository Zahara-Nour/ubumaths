/*
 * Created by yvesb on 06/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import $ from 'jquery'
import 'jquery-textrange'

export default PaneChoixVar

/**
 * Boîte de dialogue proposant une liste formé de toutes les variables existantes
 * @param {boolean} bHor true si la liste des varaibles et le pane d'info sont sur une même ligne et false sinon
 * @param {MtgApp} app La MtgApp Propriétaire
 * @param {string} title le titre à afficher au-dessus de la liste
 * @constructor
 */
function PaneChoixVar (app, bHor, title) {
  let tr, td, i, option, caption
  const tit = getStr(arguments.length === 2 ? 'Variable' : title)
  const liste = app.listePr
  const self = this
  this.inf = liste.listeParNatCal(app, NatCal.NVariable, -1)
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  this.container = tabPrincipal
  tr = ce('TR')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:120px'
  })
  td.appendChild(caption)
  $(caption).html(tit)

  tr.appendChild(td)
  this.select = ce('select', {
    size: 5, // Le nombre de lignes visibles par défaut
    style: 'width:150px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }

  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (i = 0; i < this.inf.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }
  if (!bHor) {
    tr = ce('TR')
    tabPrincipal.appendChild(tr)
  }
  td = ce('td')
  tr.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:250px'
  })
  td.appendChild(caption)
  $(caption).html(getStr('ChoixValeurDlg3'))
  this.textarea = ce('textarea', {
    cols: 40,
    rows: 5,
    disabled: 'true'
  })
  $(this.textarea).css('font-size', '13px')
  td.appendChild(this.textarea)
  this.onSelectChange()
}

PaneChoixVar.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  const el = this.inf.pointeurs[ind]
  $(this.textarea).text(el.infoHist())
}

PaneChoixVar.prototype.getVar = function () {
  return this.inf.pointeurs[this.select.selectedIndex]
}

/**
 * Fonction sélectionnant dans la liste la variable va
 * @param va
 */
PaneChoixVar.prototype.selectVar = function (va) {
  const inf = this.inf
  for (let i = 0; i < inf.noms.length; i++) {
    if (inf.pointeurs[i] === va) {
      this.select.selectedIndex = i
      break
    }
  }
}
