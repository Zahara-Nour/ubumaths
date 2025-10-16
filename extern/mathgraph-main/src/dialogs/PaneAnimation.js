/*
 * Created by yvesb on 02/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import $ from './jQuery-ui'
import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import AvertDlg from './AvertDlg'
import PaneFreq from './PaneFreq'
export default PaneAnimation

/**
 * Classe représentant un panneau permettant de choisir des options pour une animation animation
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @param infoAnim objet du type infoAnim où
 *     nbPts : est le nombre de points à calculer pour l'animation
 *     freq : est la fréquence d'animation en millièmes de secondes
 *     animCycl : est un boolean qui vaut true si l'animation est cyclique
 *     invSens : est un boolean qui vaut true si on doit inverser le sens d'animation
 * @param {boolean} binvSens true si le chechBox pour inverser le sens doit être présent
 * @param {boolean} bAnimaCyc true si le chackBox pour choix d'animation cyclique doit présent
 * @param {boolean} bFreqMax true si on veut qu'une fréquance max soit dans la liste
 * @param {boolean} bVariable true si l'animation est générée par une variable. false par défaut pour un point lié
 * @constructor
 */
function PaneAnimation (app, infoAnim, binvSens, banimCyc, bFreqMax, bVariable = false) {
  this.app = app
  this.infoAnim = infoAnim
  const tabPrincipal = ce('table', {
    cellspacing: 10
  }) // Le tableau principal qui sera this.container
  this.container = tabPrincipal
  $(tabPrincipal).css('border', '1px solid lightgray')
  const td = ce('td') // La colonne de gauche
  $(td).css('vertical-align', 'top')
  tabPrincipal.appendChild(td)
  const tabgauche = ce('table')
  td.appendChild(tabgauche)
  let tr = ce('tr')
  tabgauche.appendChild(tr)
  let div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  $(label).html(getStr(bVariable ? 'NbPtsPourAnimVar' : 'NbPtsPourAnim'))
  div.appendChild(label)
  const input = ce('input', {
    id: 'mtginput',
    type: 'text'
  })
  input.size = 4
  $(input).val(infoAnim.nbPts)
  div.appendChild(input)
  if (banimCyc) {
    tr = ce('tr')
    tabgauche.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    const cb = ce('input', {
      type: 'checkbox',
      id: 'cbAnimCycl'
    })
    div.appendChild(cb)
    if (infoAnim.animCycl) $(cb).attr('checked', 'checked')
    label = ce('label', {
      for: 'cbAnimCycl'
    })
    $(label).html(getStr('AnimCycl'))
    div.appendChild(label)
  }
  if (binvSens) {
    tr = ce('tr')
    tabgauche.appendChild(tr)
    div = ce('div')
    tr.appendChild(div)
    const cb = ce('input', {
      type: 'checkbox',
      id: 'cbInv'
    })
    div.appendChild(cb)
    if (infoAnim.invSens) $(cb).attr('checked', 'checked')
    label = ce('label', {
      for: 'cbInv'
    })
    $(label).html(getStr('InvSens'))
    div.appendChild(label)
  }
  this.paneFreq = new PaneFreq(infoAnim.freq, bFreqMax)
  tabPrincipal.appendChild(this.paneFreq.container)
  this.container = tabPrincipal
}

PaneAnimation.prototype.getinfoAnim = function () {
  const nbPts = parseInt($('#mtginput').val())
  if (nbPts < 2 || nbPts > 10000 || isNaN(nbPts)) {
    new AvertDlg(this.app, 'Incorrect', function () {
      $('#mtginput').focus()
      return false
    })
  } else {
    this.infoAnim.set(nbPts, this.paneFreq.getFreq(), $('#cbAnimCycl').prop('checked'),
      $('#cbInv').prop('checked'))
    return true
  }
}
