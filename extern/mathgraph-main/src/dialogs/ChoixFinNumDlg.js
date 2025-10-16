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

export default ChoixFinNumDlg

/**
 * Dialogue de choix des objets finaux numériques pour une construction
 * @param {MtgApp} app mtgApp propriétaire
 * @constructor
 */
function ChoixFinNumDlg (app) {
  MtgDlg.call(this, app, 'ChoixFinNumDlg')
  this.inf = app.listePr.listObjFinDisp(app)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const label = ce('label')
  $(label).html(getStr('FinDlg1'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.select = ce('select', {
    size: 12, // Le nombre de lignes visibles par défaut
    multiple: 'multiple', // Sélection multiple possible pour cette liste
    style: 'width:300px'
  })
  tr.appendChild(this.select)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const label2 = ce('label')
  $(label2).html(getStr('FinDlg2'))
  tr.appendChild(label2)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (app.listeFinNG.contains(this.inf.pointeurs[i])) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  this.create('ChoixFinNumConst', 400)
}

ChoixFinNumDlg.prototype = new MtgDlg()

ChoixFinNumDlg.prototype.OK = function () {
  const listNG = this.app.listeFinNG
  listNG.retireTout()
  const options = this.select.options
  for (let i = 0; i < options.length; i++) {
    if ($(options[i]).prop('selected')) listNG.add(this.inf.pointeurs[i])
  }
  this.destroy()
  this.app.activeOutilCapt()
}
