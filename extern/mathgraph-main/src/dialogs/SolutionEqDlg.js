/*
 * Created by yvesb on 28/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import EditeurNomCalcul from './EditeurNomCalcul'
import CValeur from '../objets/CValeur'
import AvertDlg from './AvertDlg'
import CalcR from '../kernel/CalcR'
import Pointeur from '../types/Pointeur'
import { getMtgInput } from './dom'

export default SolutionEqDlg

/**
 * Dialogue de création ou modification d'une solution approchée d'équation
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param {CSolutionEquation} sol La valeur approchée de solution dont la formule doit être modifiée
 * @param modification {boolean} true si le dialogue est ouvert pour modifier un calcul déjà existant
 * @param {function} callBackOK Fonction éventuelle à appeler après validation
 * @param {function} callBackCancel Fonction éventuelle à appeler après annulation
 */
function SolutionEqDlg (app, sol, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'fonctiondlg', callBackOK, callBackCancel)
  this.sol = sol
  this.modification = modification
  const list = app.listePr
  // 3 CValeur pour stocker les valeurs pour l'équation, a, b et c.
  this.valeura = new CValeur(list)
  this.valeurb = new CValeur(list)
  this.valeure = new CValeur(list)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  // Une ligne d'édition du nom de la solution
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('SolEqDlg2'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour le nom de la solution
  this.inputName = getMtgInput({
    size: 12
  })
  td.appendChild(this.inputName)
  // Une ligne d'édition du nom de l'inconnue
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg3') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour le nom de l'inconnue
  this.inputInc = getMtgInput({
    size: 12
  })
  td.appendChild(this.inputInc)
  // Une ligne pour l'édition de l'équation elle-même
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg4') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour l'équation
  this.inputEq = getMtgInput({
    size: 30
  })
  td.appendChild(this.inputEq)

  // Une ligne pour l'édition de la valeur de a
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg5'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de a
  this.inputa = getMtgInput({
    size: 30
  })
  td.appendChild(this.inputa)
  // Un panneau avec boutons valeurs et fonctions
  const indmax = modification ? list.indexOf(sol) - 1 : list.longueur() - 1
  const paneBoutonsValFonca = new PaneBoutonsValFonc(this.app, this, this.inputa, true, indmax)
  tabPrincipal.appendChild(paneBoutonsValFonca)

  // Une ligne pour l'édition de la valeur de b
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg6'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de b
  this.inputb = getMtgInput({
    size: 30
  })
  td.appendChild(this.inputb)
  // Un panneau avec boutons valeurs et fonctions
  const paneBoutonsValFoncb = new PaneBoutonsValFonc(this.app, this, this.inputb, true, indmax)
  tabPrincipal.appendChild(paneBoutonsValFoncb)

  // Une ligne pour l'édition de la valeur de l'incertitude
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('SolEqDlg7'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  // Editeur pour la valeur de e
  this.inpute = getMtgInput({
    size: 30
  })
  td.appendChild(this.inpute)
  // Un panneau avec boutons valeurs et fonctions
  const paneBoutonsValFonce = new PaneBoutonsValFonc(this.app, this, this.inputb, true, indmax)
  tabPrincipal.appendChild(paneBoutonsValFonce)

  if (modification) {
    $(this.inputName).val(sol.nomCalcul)
    this.inputName.setAttribute('disabled', true)
    $(this.inputInc).val(sol.inconnue)
    $(this.inputEq).val(replaceSepDecVirg(app, sol.equation, [sol.inconnue]))
    $(this.inputa).val(sol.a.chaineInfo())
    $(this.inputb).val(sol.b.chaineInfo())
    $(this.inpute).val(sol.incertitude.chaineInfo())
  }
  this.editeurName = new EditeurNomCalcul(app, !modification, this.inputName)
  this.editeurInc = new EditeurNomCalcul(app, false, this.inputInc)
  this.editora = new EditeurvaleurReelle(app, this.inputa, indmax, this.valeura, null)
  this.editorb = new EditeurvaleurReelle(app, this.inputb, indmax, this.valeurb, null)
  this.editore = new EditeurvaleurReelle(app, this.inpute, indmax, this.valeure, null)

  /*
  this.editeurEquation = new EditeurValeurReelle(app, this.inputEq,
    modification ? list.indexOf(sol) - 1 : list.longueur() - 1, this.valeureq, sol.variableFormelle());
    */
  this.create('SolEqDlg1', 500)
}

SolutionEqDlg.prototype = new MtgDlg()

SolutionEqDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.modification ? this.inputEq : this.inputName)
}

SolutionEqDlg.prototype.OK = function () {
  // var app = this.app;
  const self = this
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (!this.modification) {
    if (!this.editeurName.validate()) return
  }
  if (this.editeurInc.validate($(this.inputInc).val()) && this.editora.validate($(this.inputa).val()) &&
    this.editorb.validate($(this.inputb).val()) && this.editore.validate($(this.inpute).val())) {
    // On vérifie l'équation
    const indErr = new Pointeur(0)
    const ptmess = new Pointeur('')
    if (this.verifieFormules($(this.inputEq).val(), indErr, ptmess)) {
      this.sol.nomCalcul = $(this.inputName).val()
      this.sol.inconnue = $(this.inputInc).val()
      this.sol.a = this.valeura
      this.sol.b = this.valeurb
      this.sol.incertitude = this.valeure
      if (!this.modification) this.app.ajouteElement(this.sol)
      this.app.gestionnaire.enregistreFigureEnCours(this.modification
        ? 'ModifObj'
        : 'SolutionEq')
      this.destroy()
      if (this.callBackOK !== null) this.callBackOK()
    } else {
      new AvertDlg(this.app, ptmess.getValue(), function () {
        self.inputEq.focus()
        self.inputEq.marquePourErreur()
      })
    }
  }
}

/**
 * Fonction vérifiant si la formule entrée est correcte et est bien une formule d'équation valide
 * @param cheq La chaîne contenant l'équation
 * @param indiceErreur Contient en retour l'inidce de l'erreur dans la chaîne en cas de faute de synatxe
 * @param pointeur Renverra par getValeur une chaîne contenant l'erreur rencontrée en cas d'erreur et
 * une chaîne vide sinon.
 * @returns {boolean}
 */
SolutionEqDlg.prototype.verifieFormules = function (cheq, indiceErreur, pointeur) {
  let car, i
  // On regarde d'abord si la syntaxe est correcte comme fonction de deux variables x et y
  const parametre = [$(this.inputInc).val()]
  const list = this.sol.listeProprietaire
  let indiceMax = list.indexOf(this.sol)
  if (indiceMax === -1) indiceMax = list.longueur() - 1
  const synt = CalcR.verifieSyntaxe(list, cheq, indiceErreur, indiceMax, parametre)
  if (!synt) {
    pointeur.setValue('ErrSyntaxe')
    return false
  }
  // Si la syntaxe est correcte il faut vérifier qu'il n'y a qu'un seul signe d'égalité
  let nbegal = 0
  let par = 0
  for (i = 0; i < cheq.length; i++) {
    car = cheq.charAt(i)
    if (car === '(') par++
    else if (car === ')') par--
    else if ((car === '=') && (par === 0)) nbegal++
    if (nbegal > 1) {
      indiceErreur.setValue(i)
      break
    }
  }
  if (nbegal !== 1) {
    pointeur.setValue('ErrSyntaxe')
    return false
  }
  // La syntaxe est correcte. On crée la fonction en soustrayant le secod membre du premier
  let chfon = cheq
  par = 0
  for (i = 0; i < chfon.length; i++) {
    car = chfon.charAt(i)
    if (car === '(') par++
    else if (car === ')') par--
    else if ((car === '=') && (par === 0)) {
      chfon = chfon.substring(0, i) + '-(' + chfon.substring(i + 1) + ')'
      break
    }
  }
  const fonc = CalcR.ccb(chfon, list, 0, chfon.length - 1, parametre)
  // Il faut vérifier si la fonction dépend bien de de l'iconnue
  if (!fonc.dependDeVariable(0)) {
    pointeur.setValue('ch185')
    return false
  }
  this.sol.equation = CalcR.ccb(cheq, list, 0, cheq.length - 1, parametre)
  this.sol.fonction = fonc
  return true
}
