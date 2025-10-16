/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import ListeMacros from './ListeMacros'
import NatCal from '../types/NatCal'

export default ListeObjNumPrConst

/**
 * Objet représentant une liste d'objets numériques utilisés dans la boîte de dialogue de choix d'objets
 * numériques sourves pour une construction.
 * Herite de certaines propriétés de ListeMacros
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param bListeGauche true si c'est la liste de gauche de la boîte de dialogue qui présente les objets disponibles
 * sinon il s'agit de la liste de droite qui représente les objets numériques sélectionnés
 * @param listeSourcesCalculsChoisis Pour la liste de gauche pointe sur la liste de droite
 * @param callBackOnDblClick Fonction de callBack à appeler si on double clique sur un élément, seulement pour la liste de gauche
 */
function ListeObjNumPrConst (app, bListeGauche, listeSourcesCalculsChoisis, callBackOnDblClick = null) {
  this.app = app
  this.callBackOnDblClick = callBackOnDblClick

  this.select = ce('select', {
    size: 12, // Le nombre de lignes visibles par défaut
    style: 'width:220px'
  })
  if (bListeGauche) this.metAJourListe(listeSourcesCalculsChoisis)
  else {
    const list = app.listeSrcNG
    this.int = [] // Contiendra la liste des noms des éléments de la liste
    this.pointeurs = [] // Contiendra des pointeurs sur les macros correspondantes
    let prem = true
    for (const el of list.col) {
      const nom = el.getNom()
      this.int.push(nom)
      this.pointeurs.push(el)
      const option = ce('option', {
        class: 'mtgOption'
      })
      $(option).html(nom)
      this.select.appendChild(option)
      if (prem) {
        $(option).attr('selected', 'selected')
        prem = false
      }
    }
  }
}

ListeObjNumPrConst.prototype = new ListeMacros()

/**
 * metAJour la liste d'éléments disponibles comme éléments sources numériques pour une construction
 * sachant que listeSourcesCalculsChoisis contient la liste d'éléments déjà choisis.
 * @param listeSourcesCalculsChoisis
 */
ListeObjNumPrConst.prototype.metAJourListe = function (listeSourcesCalculsChoisis) {
  const app = this.app
  const list = app.listePr
  let prem = true
  this.retAll() // Appelé depuis ListeMacros
  for (const elb of list.col) {
    if ((elb.estDeNatureCalcul(NatCal.NObjCalcPourSourcesProto)) && !elb.estElementIntermediaire() &&
        (listeSourcesCalculsChoisis.pointeurs.indexOf(elb) === -1)) {
      let valide = true
      for (let j = 0; (j < listeSourcesCalculsChoisis.pointeurs.length) && valide; j++) {
        const el = listeSourcesCalculsChoisis.pointeurs[j]
        valide = !el.depDe(elb) && !elb.depDe(el)
      }
      for (let j = 0; (j < app.listeSrcG.longueur()) && valide; j++) {
        const el = app.listeSrcG.get(j)
        valide = !el.depDe(elb) && !elb.depDe(el)
      }
      if (valide) {
        const nom = elb.getNom()
        this.int.push(nom)
        this.pointeurs.push(elb)
        const option = ce('option', {
          class: 'mtgOption'
        })
        $(option).html(nom)
        this.select.appendChild(option)
        if (this.callBackOnDblClick) option.ondblclick = this.callBackOnDblClick
        if (prem) {
          $(option).attr('selected', 'selected')
          prem = false
        }
      }
    }
  }
}

/**
 * Fonction insérant dans la liste devant l'élément sélectionné l'objet el
 * @param el
 */
ListeObjNumPrConst.prototype.insert = function (el) {
  const sel = this.select
  const ind = sel.selectedIndex
  if (sel.selectedIndex === -1) this.add(el)
  else {
    const nom = el.getNom()
    this.int.splice(ind, 0, nom)
    this.pointeurs.splice(ind, 0, el)
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(nom)
    $(sel.options[ind]).before(option)
  }
}

/**
 * Fonction insérant au début de la liste la macro mac
 * @param el
 */
ListeObjNumPrConst.prototype.add = function (el) {
  const nom = el.getNom()
  this.int.push(nom)
  this.pointeurs.push(el)
  const option = ce('option', {
    class: 'mtgOption'
  })
  $(option).html(nom)
  this.select.appendChild(option)
  this.select.selectedIndex = this.select.length - 1
}
