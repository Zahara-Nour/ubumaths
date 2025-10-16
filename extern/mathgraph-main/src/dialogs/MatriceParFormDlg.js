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
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import AvertDlg from './AvertDlg'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import { getMtgInput } from './dom'

export default MatriceParFormDlg

/**
 * @constructor
 * @param {MtgApp} app
 * @param mat
 * @param modification
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function MatriceParFormDlg (app, mat, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'matDlg', callBackOK, callBackCancel)
  let td, tr, label
  const self = this
  this.mat = mat
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie pour l'abscisse avant vérification
  this.valeurn = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'ordonnée avant vérification
  this.valeurp = new CValeur(list, 0)
  this.valn = new CValeur(list, this.mat.n)
  this.valp = new CValeur(list, this.mat.p)
  const indmax = modification ? list.indexOf(mat) - 1 : list.longueur() - 1
  this.valeur = new CValeur(list) // Sera chargé de contenir la formule proposée
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
  tr = ce('tr')
  tabDim.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbLi') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputn = getMtgInput({
    id: 'mtginputn'
  })
  td.appendChild(this.inputn)
  tr.appendChild(td)
  tr = ce('tr')
  tabDim.appendChild(tr)
  const paneBoutonsValFoncn = new PaneBoutonsValFonc(app, this, this.inputn, true, indmax)
  tr.appendChild(paneBoutonsValFoncn)
  tr = ce('tr')
  tabDim.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('NbCo') + ' : ')
  td.appendChild(label)
  td = ce('td')
  this.inputp = getMtgInput({
    id: 'mtginputp'
  })
  td.appendChild(this.inputp)
  tr.appendChild(td)
  tr = ce('tr')
  tabDim.appendChild(tr)
  const paneBoutonsValFoncp = new PaneBoutonsValFonc(app, this, this.inputp, true, indmax)
  tr.appendChild(paneBoutonsValFoncp)
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
  $(label).html(getStr('Formule') + '(i,j) : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputFormula = getMtgInput({
    size: 55
  })
  td.appendChild(this.inputFormula)
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputFormula, true, indmax)
  tab.appendChild(paneBoutonsValFonc)
  if (modification) {
    $(this.inputName).val(this.mat.nomCalcul)
    $(this.inputName).attr('disabled', true)
  }
  $(this.inputn).val(this.mat.nbrow.chaineInfo())
  $(this.inputp).val(this.mat.nbcol.chaineInfo())
  $(this.inputFormula).val(replaceSepDecVirg(app, this.mat.calcul, ['i', 'j']))

  this.inputn.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputp).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }
  this.inputp.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputn).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }
  this.inputFormula.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  // Un éditeur de formule pour la fonction de deux varia bles (i,j)
  this.editeurFormule = new EditeurvaleurReelle(app, this.inputFormula, indmax, this.valeur, ['i', 'j'])
  // et deux éditeurs de formules pour nbrow et nbcol
  this.editeurValn = new EditeurvaleurReelle(app, this.inputn, indmax, this.valeurn, null)
  this.editeurValp = new EditeurvaleurReelle(app, this.inputp, indmax, this.valeurp, null)
  this.create('MatriceParForm', 650)
}

MatriceParFormDlg.prototype = new MtgDlg()

MatriceParFormDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputFormula : this.inputName)
}

MatriceParFormDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    if (this.editeurValn.validate($(this.inputn).val())) {
      if (this.editeurValp.validate($(this.inputp).val())) {
        const app = this.app
        // On regarde si la chaîne entrée est non-vide et ne contient que des caractères ascii
        const nblig = this.valeurn.valeur
        if (nblig < 0 || nblig !== Math.round(nblig)) {
          new AvertDlg(app, 'Invalide')
          $('#mtginputn').focus()
          return
        }
        const nbcol = this.valeurp.rendValeur()
        if (nbcol < 0 || nbcol !== Math.round(nbcol)) {
          new AvertDlg(app, 'Invalide')
          $('#mtginputp').focus()
          return
        }
        if (this.editeurFormule.validate($(this.inputFormula).val())) {
          if (!this.modification) {
            this.mat.nomCalcul = $(this.inputName).val()
          }
          this.mat.nbrow = this.valeurn
          this.mat.nbcol = this.valeurp
          this.mat.calcul = this.valeur.calcul
          // Il faut recréer les calculs clones du calcul principal//
          // Pour cela on met this.mat.n et this.mat.p à zéro ce qui recréera les calculs
          // dans CMatriceParForm.positionne
          this.mat.n = 0
          this.mat.p = 0
          this.mat.positionne(false)
          if (!this.modification) this.app.ajouteElement(this.mat)
          this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'MatriceParForm')
          if (this.callBackOK !== null) this.callBackOK()
          this.destroy()
        }
      } else $(this.inputp).focus()
    } else $(this.inputn).focus()
  }
}
