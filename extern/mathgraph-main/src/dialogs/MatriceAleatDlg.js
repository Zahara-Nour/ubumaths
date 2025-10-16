/*
 * Created by yvesb on 03/06/2021.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg, SHORT_MAX_VALUE } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'

export default MatriceAleatDlg

/**
 * @constructor
 * @param {MtgApp} app
 * @param mat
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function MatriceAleatDlg (app, mat, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'matDlg', callBackOK, callBackCancel)
  let td, tr, label
  const self = this
  this.mat = mat
  this.modification = modification
  const list = app.listePr
  const indmax = modification ? list.indexOf(mat) - 1 : list.longueur() - 1
  this.valn = new CValeur(list, this.mat.n)
  this.valp = new CValeur(list, this.mat.p)
  this.valmin = new CValeur(list, this.mat.min)
  this.valmax = new CValeur(list, this.mat.max)
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
  tr.appendChild(td)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabDim = ce('table')
  tr.appendChild(tabDim)
  tr = ce('table')
  tabDim.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbLi') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputn = getMtgInput({
    id: 'mtginputn',
    size: 4
  })
  td.appendChild(this.inputn)
  tr.appendChild(td)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbCo') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputp = getMtgInput({
    id: 'mtginputp',
    size: 4
  })
  td.appendChild(this.inputp)

  tr.appendChild(td)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabVal = ce('table')
  tr.appendChild(tabVal)
  tr = ce('tr')
  tabVal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  const tab = ce('table')
  // this.appendChild(tab);
  td.appendChild(tab)
  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('ValMin'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMin = getMtgInput({
  })
  this.inputMin.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputMax).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }

  td.appendChild(this.inputMin)
  const paneBoutonsValFoncMin = new PaneBoutonsValFonc(this.app, this, this.inputMin, true, indmax)
  tab.appendChild(paneBoutonsValFoncMin)
  this.editorMin = new EditeurvaleurReelle(app, this.inputMin, indmax, this.valmin, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('ValMax'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMax = getMtgInput({
  })
  this.inputMax.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputMin).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }

  td.appendChild(this.inputMax)
  const paneBoutonsValFoncMax = new PaneBoutonsValFonc(this.app, this, this.inputMax, true, indmax)
  tab.appendChild(paneBoutonsValFoncMax)
  this.editorMax = new EditeurvaleurReelle(app, this.inputMax, indmax, this.valmax, null)
  if (modification) {
    $(this.inputName).val(this.mat.nomCalcul)
    $(this.inputName).attr('disabled', true)
  }
  $(this.inputn).val(this.mat.n)
  $(this.inputp).val(this.mat.p)
  $(this.inputMin).val(replaceSepDecVirg(app, mat.min.calcul))
  $(this.inputMax).val(replaceSepDecVirg(app, mat.max.calcul))

  // Deux éditeurs de valeur réelle pour le nombre de lignes et de colonnes sans avertissement si faute de syntaxe
  this.editeurn = new EditeurvaleurReelle(app, this.inputn, -1, this.valn, null)
  this.editeurp = new EditeurvaleurReelle(app, this.inputp, -1, this.valp, null)
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  this.create('MatriceAleat', 550)
}

MatriceAleatDlg.prototype = new MtgDlg()

const verifVal = (val) => {
  return (val = Math.round(val)) && (val >= -SHORT_MAX_VALUE) && (val <= SHORT_MAX_VALUE)
}

MatriceAleatDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputMin : this.inputName)
}

MatriceAleatDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    let nblig, nbcol
    const app = this.app
    if (!this.modification) {
      this.mat.nomCalcul = $(this.inputName).val()
    }
    // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
    if (!this.editeurn.validate($('#mtginputn').val())) {
      return
    } else {
      nblig = this.valn.rendValeur()
      if (nblig <= 0 || !Number.isInteger(nblig)) {
        this.inputn.marquePourErreur()
        new AvertDlg(app, 'Invalide', () => $('#mtginputn').focus())
        return
      }
    }
    if (!this.editeurp.validate($('#mtginputp').val())) {
      return
    } else {
      nbcol = this.valp.rendValeur()
      if (nbcol <= 0 || !Number.isInteger(nbcol)) {
        this.inputp.marquePourErreur()
        new AvertDlg(app, 'Invalide', () => $('#mtginputp').focus())
        return
      }
    }
    if (nbcol * nblig > 100000) {
      new AvertDlg(app, getStr('nbCelMax1') + 100000 + getStr('nbCelMax2'), () => $('#mtginputn').focus())
      return
    }
    const selmin = $(this.inputMin)
    const selmax = $(this.inputMax)
    if (this.editorMin.validate($(this.inputMin).val())) {
      if (!verifVal(this.valmin.valeur)) {
        new AvertDlg(app, getStr('ErrNonEnt'), () => {
          selmin.focus()
        })
        return
      }
      if (this.editorMax.validate($(this.inputMax).val())) {
        if (!verifVal(this.valmax.valeur)) {
          new AvertDlg(app, getStr('ErrNonEnt'), () => {
            selmax.focus()
          })
          return
        }
        if (this.valmin.valeur > this.valmax.valeur) {
          new AvertDlg(app, getStr('ErrMinMax'), () => {
            selmax.focus()
          })
          return
        }
        if (this.valmax.valeur - this.valmin.valeur > 1000) {
          new AvertDlg(app, getStr('ErrMatAleat1'), () => {
            selmax.focus()
          })
          return
        }
        this.mat.n = nblig
        this.mat.p = nbcol
        this.mat.min = this.valmin
        this.mat.max = this.valmax
        if (this.modification) this.mat.positionne(true) // Pour recalculer les termes aléatoires.
        else this.app.ajouteElement(this.mat)
        this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'MatriceAleat')
        if (this.callBackOK !== null) this.callBackOK()
        this.destroy()
      } else selmax.focus()
    } else selmin.focus()
  }
}
