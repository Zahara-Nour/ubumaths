/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'

import { ce, empty } from '../kernel/dom'
import CSousListeObjets from '../objets/CSousListeObjets'
import NatObj from '../types/NatObj'

export default ListeMacros

/**
 * Objet représentant une liste de macros
 * @constructor
 * @param {MtgApp} app est l'application propriétaire
 * @param bInitListe true si on veut que a liste soit initialisée avec les macros présentes dans l'application
 * @param {number} indMaxi  L'indice de la dernière macro qui peut être rajoutée à la liste.
 * @param {function} ondblclick  Fonction de callBack à appeler si on double clique sur
 * un élément de la liste.
 * @param {function} onchange  Fonction de callBack à appeler si on change la sélection
 * un élément de la liste.
 * @param {boolean} bOnlyForLoop  si true on ne met dans la liste que les macros dont la fonction
 * peutEtreMacroFinBoucle() renvoie true
 */
function ListeMacros (app, bInitListe, indMaxi, ondblclick = null, bOnlyForLoop = false, onchange = null) {
  // Test suivant nécessaire car ListeObjNumPrConst hérite de ListeMacros
  if (arguments.length !== 0) {
    this.app = app
    const list = app.listePr
    this.select = ce('select', {
      size: 6, // Le nombre de lignes visibles par défaut
      style: 'width:220px'
    })
    if (onchange) this.select.onchange = onchange
    this.int = [] // Contiendra la liste des intitulés des macros de la liste
    this.pointeurs = [] // Contiendra des pointeurs sur les macros correspondantes
    if (bInitListe) {
      let prem = true
      for (let i = 0; i <= indMaxi; i++) {
        const el = list.get(i)
        if (el.estDeNature(NatObj.NMacro) &&
          !el.estElementIntermediaire() && (bOnlyForLoop ? el.peutEtreMacroFinBoucle() : true)) {
          this.int.push(el.intitule)
          this.pointeurs.push(el)
          const option = ce('option', {
            class: 'mtgOption'
          })
          $(option).html(el.intitule)
          this.select.appendChild(option)
          if (ondblclick) option.ondblclick = ondblclick
          if (prem) {
            $(option).attr('selected', 'selected')
            prem = false
          }
        }
      }
    }
  }
}

/**
 * Fonction ajoutant à la liste les macros d'une CMacroSuiteMacro
 * @param {CMacroSuiteMacros} macSuiteMac
 */
ListeMacros.prototype.addMacrosOf = function (macSuiteMac) {
  const list = macSuiteMac.listeAssociee
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    this.int.push(el.intitule)
    this.pointeurs.push(el)
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(el.intitule)
    this.select.appendChild(option)
    if (i === 0) $(option).attr('selected', 'selected')
  }
}

/**
 * Fonction insérant au début de la liste la macro mac
 * @param mac
 */
ListeMacros.prototype.add = function (mac) {
  this.int.push(mac.intitule)
  this.pointeurs.push(mac)
  const option = ce('option', {
    class: 'mtgOption'
  })
  $(option).html(mac.intitule)
  this.select.appendChild(option)
  this.select.selectedIndex = this.select.length - 1
}

/**
 * Fonction insérant dans la liste devant l'élément sélectionné la macro mac
 * @param mac
 */
ListeMacros.prototype.insert = function (mac) {
  const sel = this.select
  const ind = sel.selectedIndex
  if (sel.selectedIndex === -1) this.add(mac)
  else {
    this.int.splice(ind, 0, mac.intitule)
    this.pointeurs.splice(ind, 0, mac)
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(mac.intitule)
    $(sel.options[ind]).before(option)
  }
}

ListeMacros.prototype.insertDeb = function (el) {
  const sel = this.select
  if (sel.selectedIndex === -1) this.add(el)
  else {
    sel.selectedIndex = 0
    this.insert(el)
    sel.selectedIndex = 0
  }
}

ListeMacros.prototype.up = function () {
  const sel = this.select
  const ind = sel.selectedIndex
  if (!(ind <= 0)) {
    const int = this.int
    const pointeurs = this.pointeurs
    const option = this.select.options[ind]
    sel.removeChild(option)
    $(sel.options[ind - 1]).before(option)
    sel.selectedIndex = ind - 1
    let aux = int[ind]
    int[ind] = int[ind - 1]
    int[ind - 1] = aux
    aux = pointeurs[ind]
    pointeurs[ind] = pointeurs[ind - 1]
    pointeurs[ind - 1] = aux
  }
}

ListeMacros.prototype.down = function () {
  const sel = this.select
  const ind = sel.selectedIndex
  if ((ind !== -1) && (ind !== sel.length - 1)) {
    const int = this.int
    const pointeurs = this.pointeurs
    const option = this.select.options[ind]
    sel.removeChild(option)
    $(sel.options[ind]).after(option)
    sel.selectedIndex = ind + 1
    let aux = int[ind]
    int[ind] = int[ind + 1]
    int[ind + 1] = aux
    aux = pointeurs[ind]
    pointeurs[ind] = pointeurs[ind + 1]
    pointeurs[ind + 1] = aux
  }
}

ListeMacros.prototype.getSelectedItem = function () {
  return this.pointeurs[this.select.selectedIndex]
}

/**
 * Fonction retirant la macro actuellement sélectionnée de la liste
 */
ListeMacros.prototype.ret = function () {
  const sel = this.select
  const ind = sel.selectedIndex
  if (ind !== -1) {
    this.int.splice(ind, 1)
    this.pointeurs.splice(ind, 1)
    sel.removeChild(this.select.options[ind])
    sel.selectedIndex = (ind < sel.length) ? ind : ind - 1
  }
}

ListeMacros.prototype.retAll = function () {
  this.int = []
  this.pointeurs = []
  empty(this.select)
}

/**
 * Fonction renvoyant une CSousListeObjets contenant tous les objets de la liste
 */
ListeMacros.prototype.getList = function () {
  const list = new CSousListeObjets()
  for (let i = 0; i < this.pointeurs.length; i++) list.add(this.pointeurs[i])
  return list
}

ListeMacros.prototype.selectElt = function (mac) {
  const sel = this.select
  for (let i = 0; i < this.pointeurs.length; i++) {
    if (this.pointeurs[i] === mac) sel.selectedIndex = i
  }
}
