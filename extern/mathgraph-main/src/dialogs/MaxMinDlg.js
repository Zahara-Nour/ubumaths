/*
 * Created by yvesb on 02/04/2017.
 */
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
import { getMtgInput } from './dom'

export default MaxMinDlg

/**
 * Dialogue de création ou modification de d'abscisse d'un maximum ou minimum de fonction
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param fonc La fonction dont la formule doit être modifiée
 * @param modification {boolean} : true si le dialogue est ouvert pour modifier un calcul déjà existant
 * @param callBackOK Fonction éventuelle à appeler après validation
 * @param callBackCancel Fonction éventuelle à appeler après annulation
 */
function MaxMinDlg (app, max, modification, bmax, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'MaxMindlg', callBackOK, callBackCancel)
  this.max = max
  this.modification = modification
  this.bmax = bmax
  const list = app.listePr
  const indmax = modification ? list.indexOf(max) - 1 : list.longueur() - 1
  this.inf = list.listeParNatCal(app, NatCal.NFonction, indmax)
  // 3 CValeur pour stocker les valeurs pour l'équation, a, b et c.
  this.valeura = new CValeur(list)
  this.valeurb = new CValeur(list)
  this.valeure = new CValeur(list)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr(bmax ? 'MaxDlg2' : 'MinDlg2'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour le nom de la solution
  this.inputName = getMtgInput({
    size: 12
  })
  td.appendChild(this.inputName)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabMil = ce('table')
  tr.appendChild(tabMil)
  tr = ce('tr')
  tabMil.appendChild(tr)
  const tdGauche = ce('td')
  $(tdGauche).css('vertical-align', 'middle')
  tabMil.appendChild(tdGauche)
  const tabHautGauche = ce('table')
  tdGauche.appendChild(tabHautGauche)
  tr = ce('tr')
  tabHautGauche.appendChild(tr)
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Fonction') + ' :')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.select = ce('SELECT', {
    size: 6, // Le nombre de lignes visibles par défaut
    style: 'width:150px'
  })
  const self = this
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (modification ? (this.inf.pointeurs[i] === max.fonctionAssociee) : i === 0) option.setAttribute('selected', 'selected')
    // option.innerHTML = this.inf.noms[i];
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }

  const tdDroit = ce('td')
  tabMil.appendChild(tdDroit)
  const tabHautDroit = ce('table')
  tdDroit.appendChild(tabHautDroit)
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  // Une ligne pour l'édition de la valeur de a
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg5'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de a
  this.inputa = getMtgInput()
  $(this.inputa).attr('size', 20)
  td.appendChild(this.inputa)
  // Un panneau avec boutons valeurs et fonctions
  const paneBoutonsValFonca = new PaneBoutonsValFonc(this.app, this, this.inputa, true, indmax)
  tabHautDroit.appendChild(paneBoutonsValFonca)

  // Une ligne pour l'édition de la valeur de b
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg6'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputb = getMtgInput()
  $(this.inputb).attr('size', 20)
  td.appendChild(this.inputb)
  // Un panneau avec boutons valeurs et fonctions
  const paneBoutonsValFoncb = new PaneBoutonsValFonc(this.app, this, this.inputb, true, indmax)
  tabHautDroit.appendChild(paneBoutonsValFoncb)

  // Une ligne pour l'édition de la valeur de l'incertitude
  tr = ce('tr')
  tabHautDroit.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg7'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inpute = getMtgInput()
  $(this.inpue).attr('size', 20)
  td.appendChild(this.inpute)
  // Un panneau avec boutons valeurs et fonctions
  const paneBoutonsValFonce = new PaneBoutonsValFonc(this.app, this, this.inputb, true, indmax)
  tabHautDroit.appendChild(paneBoutonsValFonce)

  // En bas un tableau pour afficher des infos sur la fonction sélectionnée
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
    rows: 4
  })
  tr.appendChild(inputinf)
  this.editorName = new EditeurNomCalcul(app, !modification, this.inputName)
  if (modification) {
    $(this.inputName).val(max.nomCalcul)
    $(this.inputName).attr('disabled', true)
    $(this.inputa).val(max.a.chaineInfo())
    $(this.inputb).val(max.b.chaineInfo())
    $(this.inpute).val(max.incertitude.chaineInfo())
  }

  this.editora = new EditeurvaleurReelle(app, this.inputa, indmax, this.valeura, null)
  this.editorb = new EditeurvaleurReelle(app, this.inputb, indmax, this.valeurb, null)
  this.editore = new EditeurvaleurReelle(app, this.inpute, indmax, this.valeure, null)
  this.onSelectChange()
  this.create(bmax ? 'MaxDlg1' : 'MinDlg1', 600)
}

MaxMinDlg.prototype = new MtgDlg()

MaxMinDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.inf.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

MaxMinDlg.prototype.OK = function () {
  // Si un message d'avertissement est en cours, on ne tien pas compte de OKs
  const app = this.app
  // if (app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (!this.modification) {
    if (!this.editorName.validate()) return
  }
  if (this.editora.validate($(this.inputa).val())) {
    if (this.editorb.validate($(this.inputb).val())) {
      if (this.editore.validate($(this.inpute).val())) {
        this.max.nomCalcul = $(this.inputName).val()
        this.max.fonctionAssociee = this.inf.pointeurs[this.select.selectedIndex]
        this.max.a = this.valeura
        this.max.b = this.valeurb
        this.max.incertitude = this.valeure
        if (!this.modification) app.ajouteElement(this.max)
        app.gestionnaire.enregistreFigureEnCours(this.modification
          ? 'ModifObj'
          : this.bmax ? 'Max' : 'Min')
        this.destroy()
        if (this.callBackOK !== null) this.callBackOK()
      }
    }
  }
}
