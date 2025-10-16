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
export default CourbeAvecTanDlg

/**
 * Boîte de dialogue pour créer une courbe définie par des points (de 2 à 9)
 * et des coefficients directeurs de tangentes dans un repère
 * @param {MtgApp} app L'application proprétaire
 * @param callBackOK Fonction de callBack prenant deux paramètres nbPts et rep qui sont le nomebre de points
 * choisis par l'utilisateur et le repère choisi
 * @param callBackCancel Fonction de callBack à appeler si l'utilisateur annule
 * @constructor
 */
function CourbeAvecTanDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbeAvecTanDlg', callBackOK, callBackCancel)
  const list = app.listePr
  const tabPrincipal = ce('table')
  let tr = ce('tr')
  let label = ce('label')
  const tabBas = ce('table')
  let td = ce('td', {
    style: 'vertical-align:top;'
  })
  const tabBasDroit = ce('table')
  this.appendChild(tabPrincipal)
  tabPrincipal.appendChild(tr)
  $(label).html(getStr('CourbeAvecTanDlg1'))
  tr.appendChild(label)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('CourbeAvecTanDlg2'))
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
    size: 6 // Le nombre de lignes visibles par défaut
  })
  td.appendChild(this.select)
  for (let i = 2; i < 11; i++) {
    const option = ce('option', {
      class: 'mtgOption'
    })
    if (i === 3) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.select.appendChild(option)
  }
  // Version 7.0 : On donne la possibilité de créer une seule fonction polynôme répondant à la question.
  // Son degré sera alors de 2N où N est le nombre de points et on utilisera le calcul matriciel
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  $(label).html(getStr('CourbeAvecTanDlg5'))
  tr.appendChild(label)
  this.cb = ce('input', {
    type: 'checkbox',
    id: 'cbpoly'
  })
  tr.appendChild(this.cb)
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
    size: 5 // 3 ou 4 trop petit sur iPad
  })
  $(inputnb).val('1000')
  td.appendChild(inputnb)
  this.create('CourbeAvecTan', 500)
}

CourbeAvecTanDlg.prototype = new MtgDlg()

CourbeAvecTanDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'inputnb')
}

CourbeAvecTanDlg.prototype.OK = function () {
  const app = this.app
  const nbPtsCourbe = parseInt($('#inputnb').val())
  if (nbPtsCourbe < 4 || nbPtsCourbe > 5000 || isNaN(nbPtsCourbe)) {
    new AvertDlg(app, 'Incorrect', function () {
      $('#inputnb').focus()
    })
  } else {
    this.destroy()
    this.callBackOK(this.select.selectedIndex + 2, this.paneListeRep.getSelectedRep(),
      $(this.cb).prop('checked'), nbPtsCourbe)
  }
}
