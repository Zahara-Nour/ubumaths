/*
 * Created by yvesb on 22/06/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CoefBarycentreDlg from './CoefBarycentreDlg'
import $ from 'jquery'
export default ModificationBarycentreDlg

/**
 * Boîte de dialogue servant à modifier les coefficients de barycentre bar
 * @param {MtgApp} app L'application MtgApp propriétaire
 * @param bar Le barycentre à modifier
 * @param callBackOK Fonction de callBack à appeler si l'utilisateur valide par OK
 * @param callBackCancel Fonction de callback appelée si l'utilisateur abandonne la modification
 * @constructor
 */
function ModificationBarycentreDlg (app, bar, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ModificationBarDlg', callBackOK, callBackCancel)
  this.bar = bar
  const self = this
  const list = this.app.listePr
  // On crée un clone du barycentre. Au cas où l'utilisateur abandonnerait la boîte de dialogue par cancel,
  // on réaffectera à bar les coefficients de barClone
  this.barClone = bar.getClone(list, list)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let td = ce('td')
  tabPrincipal.appendChild(td)
  $(td).css('vertical-align', 'top')
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visilbles par défaut
    style: 'width:250px'
  })
  td.appendChild(this.select)
  this.initList()

  td = ce('td')
  tabPrincipal.appendChild(td)
  $(td).css('vertical-align', 'middle')
  const btnModifier = ce('button', {
    tabindex: -1
  })
  td.appendChild(btnModifier)
  this.btnModifier = btnModifier
  btnModifier.onclick = function () { self.onBtnModifier() }
  $(btnModifier).html(getStr('Modifier'))
  // Création de la boîte de dialogue par jqueryui
  this.create('ModifBar', 450)
}
ModificationBarycentreDlg.prototype = new MtgDlg()

ModificationBarycentreDlg.prototype.initList = function () {
  let i, option, noeud
  const self = this
  for (i = this.select.options.length - 1; i >= 0; i--) this.select.remove(i)
  const bar = this.bar
  for (i = 0; i < bar.col.length; i++) {
    option = ce('Option', {
      class: 'mtgOption',
      id: 'opt' + i // Pour mouvoir modifier directement un membre de la liste
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    noeud = bar.col[i]
    $(option).html(noeud.pointAssocie.nom + ' : ' + noeud.poids.chaineInfo())
    option.ondblclick = function () { self.onBtnModifier() }
    this.select.appendChild(option)
  }
}

ModificationBarycentreDlg.prototype.onBtnModifier = function () {
  const ind = this.select.selectedIndex
  const self = this
  new CoefBarycentreDlg(this.app, this.bar, this.bar.col[ind], true,
    function () { // Appelé si l'utilisateur a validé le nouveau coefficient.
      const noeud = self.bar.col[ind]
      $('#opt' + ind).html(noeud.pointAssocie.nom + ' : ' + noeud.poids.chaineInfo())
    },
    function () {
    }
  )
}

ModificationBarycentreDlg.prototype.onCancel = function () {
  // On remet les coefficients du barycentre à leur état initial
  const col = this.bar.col
  const colClone = this.barClone.col
  for (let i = 0; i < col.length; i++) {
    col[i].poids = colClone[i].poids
  }
  this.destroy()
}

ModificationBarycentreDlg.prototype.OK = function () {
  this.destroy()
  this.callBackOK()
}
