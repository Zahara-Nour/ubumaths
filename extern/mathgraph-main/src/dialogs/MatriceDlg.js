/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, empty } from '../kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import AvertDlg from './AvertDlg'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import CMatrice from '../objets/CMatrice'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'

export default MatriceDlg

/**
 * Dialogue de création d'une matrice
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param mat La marice à éditer
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK null ou fonction de callBack à appeler après OK
 * @param callBackCancel null ou fonction de callBack à appeler après annumlation
 */
function MatriceDlg (app, mat, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'matDlg', callBackOK, callBackCancel)
  let td, tr, label
  const self = this
  this.mat = mat
  this.modification = modification
  this.n = mat.n // Nombre de lignes initial
  this.p = mat.p // Nombre de colonnes initial
  const list = app.listePr
  this.indmax = modification ? list.indexOf(mat) - 1 : list.longueur() - 1
  this.valNbLig = new CValeur(list, this.n)
  this.valNbCol = new CValeur(list, this.p)
  // On crée un tableau de CValeurs pour stocker les réponses dans les champs d'édition
  this.tabVal = []
  for (let i = 0; i < this.n; i++) {
    const lig = []
    for (let j = 0; j < this.p; j++) {
      lig.push(new CValeur(list, this.modification ? this.mat.tabVal[i][j] : '0'))
    }
    this.tabVal.push(lig)
  }
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabNom = ce('table')
  tr.appendChild(tabNom)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabNom.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NomMat') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputName = getMtgInput()
  td.appendChild(this.inputName)
  if (modification) $(this.inputName).val(this.mat.nomCalcul)
  tr.appendChild(td)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('NbLi') + ' : ')
  td = ce('td')
  tr.appendChild(td)
  const inputnblig = getMtgInput({
    id: 'mtginputnblig',
    size: 2,
    maxlength: 2
  })
  td.appendChild(inputnblig)
  inputnblig.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
    } else {
      if (!self.editeurNbLig.validate($('#mtginputnblig').val())) {
        empty(self.tabEdit)
      } else {
        const ch = $('#mtginputnblig').val()
        self.n = parseInt(ch)
        self.resetEditeurs()
      }
    }
  }
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('NbCo') + ' : ')
  td = ce('td')
  tr.appendChild(td)
  const inputnbcol = getMtgInput({
    id: 'mtginputnbcol',
    size: 2,
    maxlength: 2
  })
  td.appendChild(inputnbcol)
  inputnbcol.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
    } else {
      if (!self.editeurNbLig.validate($('#mtginputnbcol').val())) {
        empty(self.tabEdit)
      } else {
        const ch = $('#mtginputnbcol').val()
        self.p = parseInt(ch)
        self.resetEditeurs()
      }
    }
  }
  $(inputnblig).val(this.mat.n)
  $(inputnbcol).val(this.mat.p)
  if (modification) {
    $(this.inputName).attr('disabled', true)
    $(inputnblig).attr('disabled', true)
    $(inputnbcol).attr('disabled', true)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td', {
    style: 'overflow: auto;'
  })
  tr.appendChild(td)
  const div = ce('div', {
    style: 'width:650px;height:200px;'
  })
  td.appendChild(div)
  // $(td).css('overflow', 'auto')
  const tabEdit = ce('table')
  this.tabEdit = tabEdit
  div.appendChild(tabEdit)
  this.resetEditeurs()
  if (modification) {
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.p; j++) {
        $(this.edits[i][j]).val(replaceSepDecVirg(app, this.mat.tabVal[i][j].calcul))
      }
    }
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table')
  tr.appendChild(paneBas)
  // Deux éditeurs de valeur réelle pour le nombre de lignes et de colonnes sans avertissement si faute de syntaxe
  this.editeurNbLig = new EditeurvaleurReelle(app, inputnblig, -1, this.valNbLig, null, true)
  this.editeurNbCol = new EditeurvaleurReelle(app, inputnbcol, -1, this.valNbCol, null, true)
  // Deux éditeurs de valeur réelle pour le nombre de lignes et de colonnes sans avertissement si faute de syntaxe
  this.editeurNbLigValid = new EditeurvaleurReelle(app, inputnblig, -1, this.valNbLig, null)
  this.editeurNbColValid = new EditeurvaleurReelle(app, inputnbcol, -1, this.valNbCol, null)

  this.paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.edits[0][0], true, this.indmax)
  tr = ce('table')
  paneBas.appendChild(tr)
  tr.appendChild(this.paneBoutonsValFonc)
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  this.create('Matrice', 700)
}

MatriceDlg.prototype = new MtgDlg()

MatriceDlg.prototype.resetEditeurs = function () {
  if (!this.modification) { // Il faut recréer la matrice
    if (this.n * this.p > 200) {
      empty(this.tabEdit)
      return
    }
    const tabVal = []
    for (let i = 0; i < this.n; i++) {
      const lig = []
      for (let j = 0; j < this.p; j++) {
        lig.push(new CValeur(this.app.listePr, 0))
      }
      tabVal.push(lig)
    }
    this.mat = new CMatrice(this.app.listePr, null, false, '', this.n, this.p, tabVal)
  }
  this.tabVal = []
  for (let i = 0; i < this.n; i++) {
    const lig = []
    for (let j = 0; j < this.p; j++) {
      lig.push(new CValeur(this.app.listePr, 0))
    }
    this.tabVal.push(lig)
  }
  this.edits = [] // Ce tableau contiendra tous les input
  this.editors = [] // Tableau qui contiedra tous les EditeurvaleurReelle associés aux input
  empty(this.tabEdit)
  for (let i = 0; i < this.n; i++) {
    const tr = ce('tr')
    this.tabEdit.appendChild(tr)
    const lig1 = []
    this.edits.push(lig1)
    const lig2 = []
    this.editors.push(lig2)
    for (let j = 0; j < this.p; j++) {
      let td = ce('td')
      tr.appendChild(td)
      const label = ce('label', {
        style: 'white-space: nowrap'
      })
      $(label).html('a <sub>' + String(i + 1) + ',' + String(j + 1) + '</sub>' + ' = ')
      td.appendChild(label)
      td = ce('td')
      tr.appendChild(td)
      const input = getMtgInput({
        id: 'mtginput' + i + String(j),
        size: 6
      })
      input.owner = this
      td.appendChild(input)
      const self = this
      input.onkeyup = function (ev) {
        if (ev.keyCode === 13) {
          $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
          self.OK()
        }
      }
      input.onfocus = function () {
        this.owner.paneBoutonsValFonc.associeA(document.getElementById(this.getAttribute('id')))
      }
      lig1.push(input)
      lig2.push(new EditeurvaleurReelle(this.app, input, this.indmax, this.tabVal[i][j], null))
    }
  }
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      $(this.edits[i][j]).val(replaceSepDecVirg(this.app, this.tabVal[i][j].calcul))
    }
  }
}

MatriceDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? 'mtginput1' : this.inputName)
}

MatriceDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    const app = this.app
    let nblig, nbcol
    if (!this.modification) {
      this.mat.nomCalcul = $(this.inputName).val()
      if (!this.editeurNbLigValid.validate($('#mtginputnblig').val())) {
        return
      } else {
        nblig = this.valNbLig.rendValeur()
        if (nblig <= 0 || !Number.isInteger(nblig)) {
          new AvertDlg(app, 'Invalide', () => $('#mtginputnblig').focus())
          return
        }
      }
      if (!this.editeurNbColValid.validate($('#mtginputnbcol').val())) {
        return
      } else {
        nbcol = this.valNbCol.rendValeur()
        if (nbcol <= 0 || !Number.isInteger(nbcol)) {
          new AvertDlg(app, 'Invalide', () => $('#mtginputnbcol').focus())
          return
        }
      }
      this.mat.n = nblig
      this.mat.p = nbcol
    }
    if (this.mat.n * this.mat.p > 200) {
      new AvertDlg(this.app, getStr('nbCelMax1') + 200 + getStr('nbCelMax2'), () => $('#mtginputnblig').focus())
      return
    }
    let valide = true
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.p; j++) {
        const sel = $('#mtginput' + i + String(j))
        valide = this.editors[i][j].validate(sel.val())
        if (!valide) {
          sel.focus()
          return
        }
      }
    }
    // On reconstruit le tableau de CValeurs de la matrice
    this.mat.tabVal = this.tabVal
    if (!this.modification) this.app.ajouteElement(this.mat)
    this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'CalculReel')
    if (this.callBackOK !== null) this.callBackOK()
    this.destroy()
  }
}
