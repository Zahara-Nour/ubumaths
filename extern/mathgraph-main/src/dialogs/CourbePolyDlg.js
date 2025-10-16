/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import PaneListeReperes from './PaneListeReperes'
import $ from 'jquery'
import { getMtgInput } from 'src/dialogs/dom'
import AvertDlg from 'src/dialogs/AvertDlg'
export default CourbePolyDlg

/**
 * Boîte de dialogue pour créer une courbe de fonction polynôme définie par des points (de 3 à 8)
 * @param {MtgApp} app L'application proprétaire
 * @param callBackOK Fonction de callBack prenant deux paramètres nbPts et rep qui sont le nomebre de points
 * choisis par l'utilisateur et le repère choisi
 * @param callBackCancel Fonction de callBack à appeler si l'utilisateur annule
 * @constructor
 */
function CourbePolyDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbePolyDlg', callBackOK, callBackCancel)
  const list = app.listePr
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  let label = ce('label')
  const tabBas = ce('table')
  let td = ce('td', {
    style: 'vertical-align:top;'
  })
  const tabBasDroit = ce('table')
  tabPrincipal.appendChild(tr)
  $(label).html(getStr('CourbeAvecTanDlg1'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  tr.appendChild(tabBas)
  tabBas.appendChild(td)
  this.paneListeRep = new PaneListeReperes(app, list.longueur() - 1)
  td.appendChild(this.paneListeRep.getTab())
  td = ce('td')
  tabBas.appendChild(td)
  td.appendChild(tabBasDroit)
  td = ce('td', {
    style: 'vertical-align:middle;'
  })
  tabBasDroit.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbPts') + ' : ')
  td.appendChild(label)
  td = ce('td', {
    style: 'vertical-align:top;'
  })
  tabBasDroit.appendChild(td)
  this.select = ce('select', {
    id: 'nbPts',
    size: 5 // Le nombre de lignes visibles par défaut
  })
  td.appendChild(this.select)
  // Versio n 7.0 : On va maintenant jusqu'à 20 points car avec les matrices
  // c'est plus puissant qu'avec les dérivées partielles
  for (let i = 3; i < 21; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    if (i === 3) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabNbPtsCourbe = ce('table')
  tr.appendChild(tabNbPtsCourbe)
  tr = ce('tr')
  tabNbPtsCourbe.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('courbeDlg10'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const inputnb = getMtgInput({
    id: 'inputnb',
    size: 4
  })
  $(inputnb).val('1000')
  td.appendChild(inputnb)
  this.create('CourbePolyDlg', 500)
}

CourbePolyDlg.prototype = new MtgDlg()

CourbePolyDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'inputnb')
}

CourbePolyDlg.prototype.OK = function () {
  const app = this.app
  const nbPts = parseInt($('#inputnb').val())
  if (nbPts < 4 || nbPts > 5000 || isNaN(nbPts)) {
    new AvertDlg(app, 'Incorrect', function () {
      $('#inputnb').focus()
    })
  } else {
    this.destroy()
    this.callBackOK(this.select.selectedIndex + 3, this.paneListeRep.getSelectedRep(), nbPts)
  }
}
