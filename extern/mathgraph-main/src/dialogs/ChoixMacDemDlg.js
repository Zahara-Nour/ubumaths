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

export default ChoixMacDemDlg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function ChoixMacDemDlg (app) {
  // Ici appel avec seulement trois paramètres car fonctionnement spécial
  MtgDlg.call(this, app, 'ChoixMacDemDlg')
  let i; let option
  const list = app.listePr
  const tabPrincipal = ce('table')
  const td = ce('td')
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:350px'
  })
  this.inf = list.listeMacPourDem()
  this.appendChild(tabPrincipal)
  tabPrincipal.appendChild(td)
  $(caption).html(getStr('Intitule'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 12, // Le nombre de lignes visibles par défaut
    style: 'width:350px'
  })
  td.appendChild(this.select)
  for (i = 0; i < this.inf.noms.length; i++) {
    option = ce('Option')
    if (this.inf.pointeurs[i] === list.macroDemarrage) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  // Création de la boîte de dialogue par jqueryui
  this.create('ChoixMacDem', 450)
}

ChoixMacDemDlg.prototype = new MtgDlg()

ChoixMacDemDlg.prototype.OK = function () {
  this.app.listePr.macroDemarrage = this.inf.pointeurs[this.select.selectedIndex]
  this.destroy()
}
