/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'
import CIntegrale from '../objets/CIntegrale'
import AvertDlg from '../dialogs/AvertDlg'
import { getMtgInput } from './dom'

export default IntegraleDlg

/**
 * Dialogue de création ou modification d'une intégrale
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param integ L'intégrale à modifier
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier un calcul déjà existant
 * @param callBackOK Fonction éventuelle à appeler après validation
 * @param callBackCancel Fonction éventuelle à appeler après annulation
 */
function IntegraleDlg (app, integ, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'Intdlg', callBackOK, callBackCancel)
  this.integ = integ
  this.modification = modification
  const self = this
  const list = app.listePr
  const indmax = modification ? list.indexOf(integ) - 1 : list.longueur() - 1
  this.inf = list.listeParNatCal(app, NatCal.NFoncR1Var, indmax)
  // 3 CValeur pour stocker les valeurs a, b (bornes d'intégration) et n (nombre d'intervalles).
  this.valeura = new CValeur(list)
  this.valeurb = new CValeur(list)
  this.valeurn = new CValeur(list)

  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  let label = ce('label')
  $(label).html(getStr('IntegDlg1'))
  tr.appendChild(label)
  // Une ligne d'édition du nom du calcul
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  div.appendChild(label)
  // Editeur pour le nom du calcul
  this.inputName = getMtgInput({
    size: 12
  })
  div.appendChild(this.inputName)
  /// ////////////////////////////////////////////////////////////////////
  // Au centre un tableau contenant deux colonnes : A gauche la liste  //
  // pour le choix de la fonction et à droite un tableau de trois      //
  // pour les éditeurs de a, b et n                                    //
  /// ////////////////////////////////////////////////////////////////////
  tr = ce('table')
  tabPrincipal.appendChild(tr)
  const tabCentre = ce('table')
  tr.appendChild(tabCentre)
  let td = ce('td')
  tabCentre.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:150px'
  })
  $(caption).html(getStr('IntegDlg2'))
  td.appendChild(caption)
  this.select = ce('select', {
    size: 10, // Le nombre de lignes visibles par défaut
    style: 'width:150px'
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
    if (modification ? (this.inf.pointeurs[i] === integ.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tabCentre.appendChild(td)
  const tabCentreDroit = ce('table')
  td.appendChild(tabCentreDroit)
  tr = ce('tr')
  tabCentreDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg5'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de a
  this.inputa = getMtgInput({
    size: 24
  })
  td.appendChild(this.inputa)
  const paneBoutonsValFonca = new PaneBoutonsValFonc(this.app, this, this.inputa, true, indmax)
  tabCentreDroit.appendChild(paneBoutonsValFonca)

  tr = ce('tr')
  tabCentreDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg6'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputb = getMtgInput({
    size: 24
  })
  td.appendChild(this.inputb)
  const paneBoutonsValFoncb = new PaneBoutonsValFonc(this.app, this, this.inputb, true, indmax)
  tabCentreDroit.appendChild(paneBoutonsValFoncb)

  tr = ce('tr')
  tabCentreDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('IntegDlg3'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputn = getMtgInput({
    size: 24
  })
  td.appendChild(this.inputn)
  const paneBoutonsValFoncn = new PaneBoutonsValFonc(this.app, this, this.inputn, true, indmax)
  tabCentreDroit.appendChild(paneBoutonsValFoncn)
  // En bas du tableau un champ d'info sur la fonction sélectionnée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('InfoFonc'))
  tr.appendChild(label)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'mtginfo',
    disabled: 'true',
    cols: 40,
    rows: 3
  })
  tr.appendChild(inputinf)

  if (modification) {
    $(this.inputName).val(integ.nomCalcul)
    this.inputName.setAttribute('disabled', true)
    $(this.inputa).val(integ.a.chaineInfo())
    $(this.inputb).val(integ.b.chaineInfo())
    $(this.inputn).val(integ.n.chaineInfo())
  }
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  this.editeura = new EditeurvaleurReelle(app, this.inputa, indmax, this.valeura, null)
  this.editeurb = new EditeurvaleurReelle(app, this.inputb, indmax, this.valeurb, null)
  this.editeurn = new EditeurvaleurReelle(app, this.inputn, indmax, this.valeurn, null)
  this.onSelectChange()
  this.create('Integ', 550)
}

IntegraleDlg.prototype = new MtgDlg()

IntegraleDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

IntegraleDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.select : this.inputName)
}

IntegraleDlg.prototype.OK = function () {
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (!this.modification) {
    if (!this.editeurName.validate()) return
  }
  if (this.editeura.validate($(this.inputa).val()) && this.editeurb.validate($(this.inputb).val()) &&
    this.editeurn.validate($(this.inputn).val())) {
    const valn = this.valeurn.valeur
    if (valn > 0 && valn <= CIntegrale.valeurMaxiDen) {
      this.integ.nomCalcul = $(this.inputName).val()
      this.integ.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
      this.integ.a = this.valeura
      this.integ.b = this.valeurb
      this.integ.n = this.valeurn
      if (!this.modification) this.app.ajouteElement(this.integ)
      this.app.gestionnaire.enregistreFigureEnCours(this.modification ? 'ModifObj' : 'Integ')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    } else {
      this.inputn.marquePourErreur()
      new AvertDlg(this.app, 'Incorrect')
    }
  }
}
