/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'

import { ceIn, addImg, ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import ListeObjNumPrConst from './ListeObjNumPrConst'

export default ChoixSrcNumDlg

/**
 * Dialogue de choix des objets sources numériques pour une construction
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 */
function ChoixSrcNumDlg (app) {
  MtgDlg.call(this, app, 'ChoixSrcNumDlg')
  const self = this
  // On crée les deux listes de gauche et de droite.
  // La liste de droite doit être créée en premier car la liste de gauche dépend des objets dépend des objets
  // présents à droite.
  this.listRight = new ListeObjNumPrConst(app, false)
  this.listLeft = new ListeObjNumPrConst(app, true, this.listRight, function () { self.onBtnAddFin() })
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  // Le panneau principal est forme de deux colonnes.
  // A gauche une colonne pour la liste des éléments numériques disponibles avec en dessous des boutons
  let td = ce('td', {
    style: 'vertical-align:top;'
  })
  tabPrincipal.appendChild(td)
  let tr = ce('tr')
  td.appendChild(tr)
  let label = ce('label')
  tr.appendChild(label)
  $(label).html(getStr('SrcDlg2'))
  tr = ce('tr')
  td.appendChild(tr)
  tr.appendChild(this.listLeft.select)
  tr = ce('tr')
  td.appendChild(tr)
  // Sous la liste de gauche un tableau contenant les trois boutons
  const tabBtnLeft = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabBtnLeft)
  const btns = ['Ins', 'AddDeb', 'AddFin']
  for (let i = 0; i < 3; i++) {
    tr = ce('tr')
    tabBtnLeft.appendChild(tr)
    const btn = ce('button', {
      tabindex: -1,
      style: 'width:220px;font-size:13px'
    })
    btn.owner = this
    btn.onclick = self['onBtn' + btns[i]]
    $(btn).html(getStr(btns[i]))
    tr.appendChild(btn)
  }

  // A droite une colonne pour la liste des éléments numériques choisi avec en dessous des boutons
  const tdright = ce('td')
  tabPrincipal.appendChild(tdright)
  tr = ce('tr')
  tdright.appendChild(tr)
  tr = ce('tr')
  tdright.appendChild(tr)
  const tabListRight = ce('table', {
    cellspacing: 0
  })
  tr.appendChild(tabListRight)
  tr = ce('tr')
  tabListRight.appendChild(tr)
  td = ce('td', {
    style: 'text-align:center;'
  })
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SrcDlg3'))
  td.appendChild(label)
  tr = ce('tr')
  tabListRight.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  td.appendChild(this.listRight.select)
  // A droite de la liste de droite deux boutons avec image pour remonter et descendre un élément
  td = ce('td', {
    style: 'vertical-align:middle;'
  })
  tr.appendChild(td)
  const tabIcones = ce('table')
  td.appendChild(tabIcones)
  for (const side of ['up', 'down']) {
    tr = ceIn(tabIcones, 'tr')
    td = ceIn(tr, 'td')
    td.owner = this
    td.style.padding = '1px'
    addImg(td, side)
    td.onclick = this[side]
  }

  // Sous la liste deux boutons
  tr = ce('tr')
  tdright.appendChild(tr)
  const tabBtnRight = ce('table', {
    cellspacing: 5
  })
  tr.appendChild(tabBtnRight)
  td = ce('td')
  tabBtnRight.appendChild(td)
  for (const name of ['Ret', 'RetAll']) {
    // FIXME, pas normal de mettre un tr dans un td, puis des button directement dans tr
    tr = ceIn(td, 'tr')
    const btn = ce('button', {
      tabindex: -1,
      style: 'width:220px;font-size:13px'
    })
    btn.owner = this
    btn.onclick = self['onBtn' + name]
    btn.textContent = getStr(name)
    tr.appendChild(btn)
  }
  this.create('ChoixSrcNumConst', 600)
}

ChoixSrcNumDlg.prototype = new MtgDlg()

ChoixSrcNumDlg.prototype.onBtnIns = function () {
  const owner = this.owner
  owner.listRight.insert(owner.listLeft.getSelectedItem())
  owner.updateLeftList()
}

ChoixSrcNumDlg.prototype.onBtnAddDeb = function () {
  const owner = this.owner
  owner.listRight.insertDeb(owner.listLeft.getSelectedItem())
  owner.updateLeftList()
}

ChoixSrcNumDlg.prototype.onBtnAddFin = function () {
  const owner = this.owner || this // Le || car peut aussi être appelé via un double click sur un item de la liste de gauche
  owner.listRight.add(owner.listLeft.getSelectedItem())
  owner.updateLeftList()
}

ChoixSrcNumDlg.prototype.updateLeftList = function () {
  this.listLeft.metAJourListe(this.listRight)
}

ChoixSrcNumDlg.prototype.onBtnRet = function () {
  const owner = this.owner
  owner.listRight.ret()
  owner.updateLeftList()
}

ChoixSrcNumDlg.prototype.onBtnRetAll = function () {
  const owner = this.owner
  owner.listRight.retAll()
  owner.updateLeftList()
}

ChoixSrcNumDlg.prototype.up = function () {
  this.owner.listRight.up()
}

ChoixSrcNumDlg.prototype.down = function () {
  this.owner.listRight.down()
}

ChoixSrcNumDlg.prototype.OK = function () {
  // On vide la liste app.listSrcNG et on lui ajoute tous les éléments de la liste de droite
  const listeNG = this.app.listeSrcNG
  listeNG.retireTout()
  const pointeurs = this.listRight.pointeurs
  for (let i = 0; i < pointeurs.length; i++) {
    listeNG.add(pointeurs[i])
  }
  this.destroy()
  this.app.activeOutilCapt()
}

ChoixSrcNumDlg.prototype.onCancel = function () {
  this.destroy()
  this.app.activeOutilCapt()
}
