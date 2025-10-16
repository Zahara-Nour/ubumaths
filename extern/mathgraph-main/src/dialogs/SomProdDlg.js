/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import MtgDlg from './MtgDlg'
//
import $ from 'jquery'
import 'jquery-textrange'
import EditeurNomCalcul from './EditeurNomCalcul'
import EditeurvaleurReelle from './EditeurValeurReelle'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import CValeur from '../objets/CValeur'
import { getMtgInput } from './dom'
export default SomProdDlg

/**
 * Boîte de dialogue servant à créer une somme indicée ou un produit indicé
 * @param {MtgApp} app L'application associée
 * @param {CTestEquivalence} somme Le test d'équivalence ou de factorisation associé
 * @param {boolean} modification true si on modifie un objet déjà créé
 * @param {boolean} bSomme true si on modifie une somme indicée, false pour un produit indicé
 * @param {function} callBackOK function appelée si l'utilisateur valide ou null
 * @param {function} callBackCancel  Fonction appelée si l'utilisateur ferme la boîte de dialogue ou null
 * @constructor
 */
function SomProdDlg (app, somme, modification, bSomme, callBackOK, callBackCancel) {
  let option
  MtgDlg.call(this, app, 'SomInd', callBackOK, callBackCancel)
  this.somme = somme
  this.modification = modification
  this.bSomme = bSomme
  const list = app.listePr
  // La formule obtenue pour le calcul de l'indice mini
  this.valeurMin = new CValeur(list)
  // La formule obtenue pour le calcul de l'indice maxi
  this.valeurMax = new CValeur(list)

  const indmax = modification ? list.indexOf(somme) - 1 : list.longueur() - 1
  this.infleft = list.listeParNatCal(app, NatCal.NTteValR, indmax)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  div.appendChild(label)
  const inputName = getMtgInput({
    id: 'inputName'
  })
  div.appendChild(inputName)
  this.inputName = inputName

  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)

  const tdleft = ce('td')
  tabCentre.appendChild(tdleft)
  let caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:250px'
  })
  $(caption).html(getStr(bSomme ? 'ValSom' : 'valProd'))
  tdleft.appendChild(caption)

  this.selectleft = ce('select', {
    size: 7, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })
  tdleft.appendChild(this.selectleft)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.infleft.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.infleft.pointeurs[i] === somme.valeur) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.infleft.noms[i])
    this.selectleft.appendChild(option)
  }
  const tabLeft = ce('table')
  tdleft.appendChild(tabLeft)
  tr = ce('tr')
  tabLeft.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('chinfo117'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMin = getMtgInput()
  td.appendChild(this.inputMin)
  const paneBoutonsValFoncLeft = new PaneBoutonsValFonc(this.app, this, this.inputMin, true, indmax)
  tabLeft.appendChild(paneBoutonsValFoncLeft)

  this.infright = list.listeParNatCal(app, NatCal.NVariable, indmax)
  const tdright = ce('td')
  tabCentre.appendChild(tdright)
  caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:250px'
  })
  $(caption).html(getStr('VarInd'))
  tdright.appendChild(caption)

  this.selectright = ce('select', {
    size: 7, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })
  tdright.appendChild(this.selectright)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.infright.noms.length; i++) {
    option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.infright.pointeurs[i] === somme.indice) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.infright.noms[i])
    this.selectright.appendChild(option)
  }

  const tabRight = ce('table')
  tdright.appendChild(tabRight)
  tr = ce('tr')
  tabRight.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('chinfo118'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputMax = getMtgInput()
  td.appendChild(this.inputMax)
  const paneBoutonsValFoncRight = new PaneBoutonsValFonc(this.app, this, this.inputMax, true, indmax)
  tabRight.appendChild(paneBoutonsValFoncRight)

  this.editeurName = new EditeurNomCalcul(app, !modification, inputName)
  this.editeurFormuleMin = new EditeurvaleurReelle(app, this.inputMin, indmax, this.valeurMin, null)
  this.editeurFormuleMax = new EditeurvaleurReelle(app, this.inputMax, indmax, this.valeurMax, null)
  if (modification) {
    $(inputName).val(somme.nomCalcul)
    $(inputName).attr('disabled', true)
    $(this.inputMin).val(somme.indiceMin.chaineInfo())
    $(this.inputMax).val(somme.indiceMax.chaineInfo())
  }

  this.create(bSomme ? 'SomInd' : 'ProdInd', 600)
}

SomProdDlg.prototype = new MtgDlg()

SomProdDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.selectleft : this.inputName)
}

SomProdDlg.prototype.OK = function () {
  if (this.editeurName.validate()) {
    if (this.editeurFormuleMin.validate($(this.inputMin).val())) {
      if (this.editeurFormuleMax.validate($(this.inputMax).val())) {
        if (!this.modification) this.somme.nomCalcul = $('#inputName').val()
        this.somme.valeur = this.infleft.pointeurs[this.selectleft.selectedIndex]
        this.somme.indice = this.infright.pointeurs[this.selectright.selectedIndex]
        this.somme.indiceMin = this.valeurMin
        this.somme.indiceMax = this.valeurMax
        this.somme.metAJour() // Nécessaire pour que this.listeElementsAncetres soit établi avant d'appeler positionne pour la première fois
        if (!this.modification) this.app.ajouteElement(this.somme)
        this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : this.bSomme ? 'SomInd' : 'ProdInd')
        this.destroy()
        if (this.callBackOK !== null) this.callBackOK()
      } else this.inputMax.focus()
    } else this.inputMin.focus()
  }
}
