/*
 * Created by yvesb on 16/12/2016.
 */
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
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'

export default ChoixModificationImageDlg

/**
 *
 * @param {MtgApp} app
 * @param callBack1
 * @param callBack2
 * @constructor
 */
function ChoixModificationImageDlg (app, callBack1, callBack2) {
  // Ici appel avec seulement trois patramètres car fonctionnement spécial
  MtgDlg.call(this, app, 'choixModifDlg')
  // Il peut arriver que l'endroit où on a cliqué soit aussi l'endroit d'un des deux boutons
  // OK ou Cancel et que la boîte se referme tout de suite.
  // Pour éviter cela on regardera le temps entre le début de la création de la boîte
  // et l'appui sur un de ces deux boutons
  this.callBack1 = callBack1
  this.callBack2 = callBack2
  const tab = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tab)
  let tr = ce('TR')
  tab.appendChild(tr)
  let label = ce('label', {
    class: 'labelSmall'
  })
  $(label).html(getStr('ChoixTrans1') + ' : ')
  tr.appendChild(label)
  tr = ce('TR')
  tab.appendChild(tr)
  label = ce('label', {
    for: 'mtgradiofirst'
  })
  $(label).html(getStr('ChoixTrans2') + ':')
  tr.appendChild(label)
  let td = ce('TD')
  tr.appendChild(td)
  let inp = ce('input', {
    id: 'mtgradiofirst',
    type: 'radio',
    name: 'choice'
  })
  inp.setAttribute('checked', 'checked')
  td.appendChild(inp)
  tr = ce('TR')
  tab.appendChild(tr)
  td = ce('TD')
  tr.appendChild(td)
  label = ce('label', {
    for: 'mtgradiolast'
  })
  $(label).html(getStr('ChoixTrans3') + ':')
  td.appendChild(label)
  td = ce('TD')
  tr.appendChild(td)
  inp = ce('input', {
    id: 'mtgradiolast',
    type: 'radio',
    name: 'choice'
  })
  td.appendChild(inp)
  // Création de la boîte de dialogue par jqueryui
  this.create('ChoixAPrec', 450)
}

ChoixModificationImageDlg.prototype = new MtgDlg()

ChoixModificationImageDlg.prototype.OK = function () {
  // var time = Date.now();
  // if (time - this.timeStart < MtgDlg.delay) return; // Moins d'une seconde dans doute mauvais endroit de clic sur un bouton
  const premierChoisi = $('#mtgradiofirst').prop('checked')
  this.destroy()
  if (premierChoisi) this.callBack1(); else this.callBack2()
}

ChoixModificationImageDlg.prototype.onCancel = function () {
  this.destroy()
  this.app.outilActif.reselect()
}
