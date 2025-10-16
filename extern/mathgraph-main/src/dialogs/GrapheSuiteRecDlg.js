/*
 * Created by yvesb on 15/04/2017.
 */
/*
 * Created by yvesb on 01/04/2017.
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
import NatCal from '../types/NatCal'
import PaneListeReperes from './PaneListeReperes'
import $ from 'jquery'
import 'jquery-textrange'
export default GrapheSuiteRecDlg

/**
 *
 * @param {MtgApp} app
 * @param grapheSuite
 * @param bReel
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function GrapheSuiteRecDlg (app, grapheSuite, bReel, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'GrapheSuiteDlg', callBackOK, callBackCancel)
  this.grapheSuite = grapheSuite
  this.bReel = bReel
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(grapheSuite) - 1 : list.longueur() - 1
  this.inf = list.listeParNatCal(app, bReel ? NatCal.NSuiteRecurrenteReelle : NatCal.NSuiteRecurrenteComplexe, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  $(tr).css('vertical-align', 'top')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:180px'
  })
  $(caption).html(getStr('graphesrDlg3'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.inf.pointeurs[i] === grapheSuite.suiteAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  td = ce('td')
  tr.appendChild(td)
  this.paneListeReperes = new PaneListeReperes(app, indmax)
  td.appendChild(this.paneListeReperes.getTab())
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table')
  tr.appendChild(paneBas)
  const div = ce('div')
  tr.appendChild(div)
  let label = ce('label', {
    for: 'cb'
  })
  $(label).html(getStr(bReel ? 'graphesrDlg1' : 'graphesrDlg2'))
  div.appendChild(label)
  const cb = ce('input', {
    type: 'checkbox',
    id: 'cb'
  })
  div.appendChild(cb)
  // En plus de la version Java, un textarea d'info sur la suite sélectionnée
  tr = ce('tr')
  paneBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InfoSuit'))
  tr.appendChild(label)
  tr = ce('tr')
  paneBas.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'info',
    disabled: 'true',
    cols: 50,
    rows: 4
  })
  tr.appendChild(inputinf)

  if (modification) {
    if (bReel) {
      if (grapheSuite.traitsDeRappelSurAbscisses) $(cb).attr('checked', 'checked')
    } else {
      if (grapheSuite.pointsRelies) $(cb).attr('checked', 'checked')
    }
  } else $(cb).attr('checked', 'checked')
  if (modification) this.paneListeReperes.selectRep(grapheSuite.repereAssocie)
  this.onSelectChange()
  this.create(bReel ? 'GrapheSuiteRec' : 'GrapheSuiteRecComp', 500)
}

GrapheSuiteRecDlg.prototype = new MtgDlg()

GrapheSuiteRecDlg.prototype.onSelectChange = function () {
  $('#info').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

GrapheSuiteRecDlg.prototype.OK = function () {
  this.grapheSuite.suiteAssociee = this.inf.pointeurs[this.select.selectedIndex]
  this.grapheSuite.repereAssocie = this.paneListeReperes.getSelectedRep()
  const b = $('#cb').prop('checked')
  if (this.bReel) this.grapheSuite.traitsDeRappelSurAbscisses = b
  else this.grapheSuite.pointsRelies = b
  if (!this.modification) this.grapheSuite.updateObjetsInternes()
  if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
  this.destroy()
  if (this.callBackOK !== null) this.callBackOK()
}
