/*
 * Created by yvesb on 02/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import { getStr } from '../kernel/kernel'
// on veut tous les exports nommés
import * as figures from '../kernel/figures'
import $ from 'jquery'

export default NewFigBaseDlg

/**
 * Dialogue affichant des types de figure de base
 * @param {MtgApp} app
 * @param tab Un array contenant les identifiants des figures
 * @param blanguage true si les figures dépendent de la langue utilisée
 * @param callBackOK Fonction de callBack à appeler après validation
 * @constructor
 */
function NewFigBaseDlg (app, tab, blanguage, callBackOK) {
  MtgDlg.call(this, app, 'NewFigBaseDlg', callBackOK)
  this.tab = tab
  this.blanguage = blanguage
  const self = this
  this.select = ce('select', {
    size: 12, // Le nombre de lignes visibles par défaut
    style: 'width:510px'
  })
  this.appendChild(this.select)
  for (let i = 0; i < tab.length; i++) {
    const option = ce('Option')
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(getStr(tab[i]))
    option.ondblclick = function () { self.OK() }
    this.select.appendChild(option)
  }
  // Création de la boîte de dialogue par jqueryui
  this.create('NewFigWith', 550)
}

NewFigBaseDlg.prototype = new MtgDlg()

NewFigBaseDlg.prototype.OK = function () {
  const app = this.app
  app.setFigByCode(figures[this.tab[this.select.selectedIndex] + (this.blanguage ? app.language : '')])
  app.activeOutilsDem()
  this.callBackOK()
  this.destroy()
}
