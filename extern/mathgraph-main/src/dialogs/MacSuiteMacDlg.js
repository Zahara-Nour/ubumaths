/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ceIn, addImg, ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MacroDlg from './MacroDlg'
import ListeMacros from './ListeMacros'
import $ from 'jquery'
import AvertDlg from './AvertDlg'

export default MacSuiteMacDlg

/**
 * Dialogue de création ou modification d'une macro d'exécution d'une suite de macros
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mac La macro qui doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier une macro déjà existante
 */
function MacSuiteMacDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let i; let btn
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(mac) - 1 : list.longueur() - 1
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé /////////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane pour présenter les deux listes de macros ////////
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)
  tr = ce('tr')
  tabCentre.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const tabCentreGauche = ce('table')
  td.appendChild(tabCentreGauche)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  const tabCentreDroit = ce('table')
  td.appendChild(tabCentreDroit)
  tr = ce('tr')
  tabCentreGauche.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('MacDispo'))
  td.appendChild(caption)
  this.listMacG = new ListeMacros(app, true, indmax, function () {
    self.addFin()
  }, false)
  td.appendChild(this.listMacG.select)
  let btns = ['Ins', 'AddDeb', 'AddFin']
  for (i = 0; i < 3; i++) {
    tr = ce('tr')
    tabCentreGauche.appendChild(tr)
    btn = ce('button', {
      tabindex: -1,
      style: 'width:220px;font-size:13px'
    })
    btn.owner = this
    btn.onclick = self['onBtn' + btns[i]]
    $(btn).html(getStr(btns[i]))
    tr.appendChild(btn)
  }
  tr = ce('tr')
  tabCentreDroit.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('MacAExec'))
  td.appendChild(caption)
  // Un tableau pour contenir la liste de droite et les flèches haut et bas
  const tabListe = ce('table')
  td.appendChild(tabListe)
  const trtab = ce('tr')
  tabListe.appendChild(trtab)
  let tdtab = ce('td')
  trtab.appendChild(tdtab)
  this.listMacD = new ListeMacros(app, false, indmax, null, false)
  if (modification) this.listMacD.addMacrosOf(mac)
  tdtab.appendChild(this.listMacD.select)
  btns = ['Ret', 'RetAll']
  for (i = 0; i < 2; i++) {
    tr = ce('tr')
    tabCentreDroit.appendChild(tr)
    btn = ce('button', {
      tabindex: -1,
      style: 'width:220px;font-size:13px'
    })
    btn.owner = this
    btn.onclick = self['onBtn' + btns[i]]
    $(btn).html(getStr(btns[i]))
    tr.appendChild(btn)
  }

  // Une dernière colonne pour contenir les flèches de déplacement
  tdtab = ce('td')
  $(tdtab).css('vertical-align', 'center')
  trtab.appendChild(tdtab)
  const tabIcones = ce('table')
  tdtab.appendChild(tabIcones)
  for (const side of ['up', 'down']) {
    tr = ceIn(tabIcones, 'tr')
    td = ceIn(tr, 'td')
    td.owner = this
    td.style.padding = '1px'
    addImg(td, side)
    td.onclick = this[side]
  }

  /// ///////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacSuiteMac', 520)
}

MacSuiteMacDlg.prototype = new MacroDlg()

MacSuiteMacDlg.prototype.OK = function () {
  const mac = this.mac
  const ch = $('#inputint').val()
  if (ch !== '') {
    const list = this.listMacD.getList()
    if (list.longueur() !== 0) {
      this.saveBasic()
      mac.listeAssociee = list
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    } else new AvertDlg(this.app, 'ErrNoMac')
  } else this.avertIncorrect()
}

MacSuiteMacDlg.prototype.up = function () {
  this.owner.listMacD.up()
}

MacSuiteMacDlg.prototype.down = function () {
  this.owner.listMacD.down()
}

MacSuiteMacDlg.prototype.onBtnIns = function () {
  const owner = this.owner
  owner.listMacD.insert(owner.listMacG.getSelectedItem())
}

MacSuiteMacDlg.prototype.onBtnAddDeb = function () {
  const owner = this.owner
  owner.listMacD.insertDeb(owner.listMacG.getSelectedItem())
}

MacSuiteMacDlg.prototype.onBtnAddFin = function () {
  this.owner.addFin()
}

MacSuiteMacDlg.prototype.addFin = function () {
  this.listMacD.add(this.listMacG.getSelectedItem())
}

MacSuiteMacDlg.prototype.onBtnRet = function () {
  const owner = this.owner
  owner.listMacD.ret()
}

MacSuiteMacDlg.prototype.onBtnRetAll = function () {
  const owner = this.owner
  owner.listMacD.retAll()
}
