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
import PaneInsChar from './PaneInsChar'

export default CarSpeciauxDlg

/**
 * Création d'un dialogue non modal permettant de choisir des caractères spéciaux de façon qu'en cliquant sur un caractère
 * editor se voit insérer le carcatère correspondant ou le code LaTeX correspondant suivant la valeur de bLatex
 * @param {MtgApp} app L'application propriétaire
 * @param editor L'éditeur dans lequel soit se faire l'insertion (getMtgInput ou textarea)
 * @param types Array de chaînes de caractères pris dans "grec", "mathjs" ou "arroxws"
 * @param bLatexInit true si c'est le code LaTeX correspondant au bouton qui doit être inséré
 * @param dlg L edialogue ppropriétaire de l'éditeur
 * @param bLatexForbidden true si on ne veut pas donner la possibilité d'insérer du code LaTeX
 * @constructor
 * @extends MtgDlg
 */
function CarSpeciauxDlg (app, editor, types, bLatexInit, dlg, bLatexForbidden) {
  MtgDlg.call(this, app, 'charspedlg')
  let tr, select
  const self = this
  this.editor = editor
  this.types = types
  this.bLatex = bLatexInit
  this.bLatexForb = bLatexForbidden
  this.dlg = dlg
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  if (types.length > 1) {
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    select = ce('select', {
      class: 'charselect', // Nécessaire pour que MtgInputWithCharSpe ne referme pas le dialogue par onblur
      size: 1, // Le nombre de lignes visibles par défaut
      style: 'width:100px'
    })
    // Pour contrer un pb avec ipad, on cacher d'abord le select puis on le montre dans onOpen
    // car sinon le select est déroulé au départ mais sans effet quand on choisit un élément de la liste.
    $(select).css('visibility', 'hidden')
    this.select = select
    tr.appendChild(select)
    for (let i = 0; i < types.length; i++) {
      const option = ce('Option')
      if (i === 0) option.setAttribute('selected', 'selected')
      $(option).html(getStr(types[i]))
      select.appendChild(option)
    }
    select.onchange = function () {
      self.update()
    }
  }
  if (!bLatexForbidden) {
    // Une checkBox pour choisir de coller le code LaTeX ou le caractère lui-même
    tr = ce('tr')
    tabPrincipal.appendChild(tr)
    const div = ce('div')
    tr.appendChild(div)
    const cb = ce('input', {
      class: 'charselect', // Pour que le clic de désactive pas la fenêtre
      id: 'cb',
      type: 'checkbox'
    })
    div.appendChild(cb)
    if (bLatexInit) $(cb).attr('checked', 'checked')
    cb.onclick = function () {
      self.update()
    }
    const label = ce('label', {
      for: 'cb'
    })
    $(label).html(getStr('CodeLatex'))
    div.appendChild(label)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // Ci-dessous ne pas utiliser this.div qui est déjà utilisé dans MtgDlg
  this.divtab = ce('div', {
    style: 'width:90px;height:140px;'
  })
  tr.appendChild(this.divtab)
  // this.update(types[0]);
  $('#' + self.id).dialog({
    modal: false,
    // title: getStr("ObjNum"),
    maxHeight: Math.min(window.innerHeight * 0.98, this.app.svg.clientHeight),
    // buttons: buttons,
    open: function () {
      self.onOpen()
    },
    width: 90,
    closeOnEscape: false,
    position: { my: 'left', at: 'right', of: $(dlg.div) }
  })
}

CarSpeciauxDlg.prototype = new MtgDlg()

CarSpeciauxDlg.prototype.update = function () {
  if (this.divtab.childNodes.length > 0) this.divtab.removeChild(this.divtab.childNodes[0])
  const bLat = this.bLatexForb ? false : $('#cb').prop('checked')
  this.divtab.appendChild(new PaneInsChar(this.types[this.select ? this.select.selectedIndex : 0],
    this.editor, this.dlg, bLat).container)
}

CarSpeciauxDlg.prototype.onOpen = function () {
  if (this.select) $(this.select).css('visibility', 'visible')
  MtgDlg.prototype.onOpen.call(this)
  this.update(this.types[this.select ? this.select.selectedIndex : 0])
  const self = this
  setTimeout(function () { self.editor.focus() }, 0)
}
