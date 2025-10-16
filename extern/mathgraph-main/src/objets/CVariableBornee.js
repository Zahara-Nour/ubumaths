/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CValDyn from './CValDyn'

import Dimf from 'src/types/Dimf'
import NatCal from 'src/types/NatCal'
import { getStr } from 'src/kernel/kernel'
import addQueue from 'src/kernel/addQueue'
import { ce, cens, ge, setAttrs } from 'src/kernel/dom'

export default CVariableBornee

/**
 * Classe représentant une variable définie par sa valeur actuelle, ses valeurs mini
 * eet maxi et son pas d'incrémentation.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  La liste proprétaire de l'objet
 * @param {CImplementationProto} impProto  null ou la construction propriétaire
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction
 * @param {string} nomCalcul  Le nom de la variable.
 * @param {number} valeurActuelle  La valeur actuelle de la variable
 * @param {number} valeurMini  La valeur mini de la variable
 * @param {number} valeurMaxi  La valeur maxi de la variable
 * @param {number} valeurPas  Le pas d'incrémentation
 * @param {string} chaineValeurMini  : Chaîne de caractères représentant le calcul donnant la valeur mini.
 * Ce calcul doit être constant.
 * @param {string} chaineValeurMaxi  Chaîne de caractères représentant le calcul donnant la valeur maxi.
 * Ce calcul doit être constant.
 * @param {string} chaineValeurPas  Chaîne de caractères représentant le calcul donnant le pas.
 * Ce calcul doit être constant.
 * @param {boolean} dialogueAssocie  true si la figure doit contenir en bas et à droite une boîte
 *  de dialogue comportant des boutons + - et = pour modifier la variable.
 * @returns {CVariableBornee}
 */
function CVariableBornee (listeProprietaire, impProto, estElementFinal, nomCalcul,
  valeurActuelle, valeurMini, valeurMaxi, valeurPas,
  chaineValeurMini, chaineValeurMaxi, chaineValeurPas, dialogueAssocie) {
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CValDyn.call(this, listeProprietaire, impProto, estElementFinal)
    this.nomCalcul = nomCalcul
    this.valeurActuelle = valeurActuelle
    this.valeurMini = valeurMini
    this.valeurMaxi = valeurMaxi
    this.valeurPas = valeurPas
    this.chaineValeurMini = chaineValeurMini
    this.chaineValeurMaxi = chaineValeurMaxi
    this.chaineValeurPas = chaineValeurPas
    this.dialogueAssocie = dialogueAssocie
  }
}
CVariableBornee.prototype = new CValDyn()
CVariableBornee.prototype.constructor = CVariableBornee
CVariableBornee.prototype.superClass = 'CValDyn'
CVariableBornee.prototype.className = 'CVariableBornee'

CVariableBornee.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  return new CVariableBornee(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.valeurActuelle, this.valeurMini, this.valeurMaxi, this.valeurPas,
    this.chaineValeurMini, this.chaineValeurMaxi, this.chaineValeurPas, this.dialogueAssocie)
}

CVariableBornee.prototype.setClone = function (ptel) {
  this.valeurActuelle = ptel.valeurActuelle
  this.valeurMini = ptel.valeurMini
  this.valeurMaxi = ptel.valeurMaxi
  this.valeurPas = ptel.valeurPas
}

CVariableBornee.prototype.getNatureCalcul = function () {
  return NatCal.NVariable
}

CVariableBornee.prototype.donneNom = function (nouveauNom) {
  this.nomCalcul = nouveauNom
}

CVariableBornee.prototype.rendValeur = function () {
  return this.valeurActuelle
}
/**
 * Fonction incrémentant la valeur actuelle de la valeur du pas si le résultat
 * est inférieur à la valeur maxi.
 * @returns {void}
 */
CVariableBornee.prototype.incremente = function () {
  const nouv = this.valeurActuelle + this.valeurPas
  if ((nouv >= this.valeurMini) && (nouv <= this.valeurMaxi)) this.valeurActuelle = nouv
}
/**
 * Fonction décrémentant la valeur actuelle de la valeur du pas si le résultat
 * est supérieur à la valeur mini.
 * @returns {void}
 */
CVariableBornee.prototype.decremente = function () {
  const nouv = this.valeurActuelle - this.valeurPas
  if ((nouv >= this.valeurMini) && (nouv <= this.valeurMaxi)) { this.valeurActuelle = nouv }
}
/**
 * Fonction donnant à la valeur actuelle la valeur valeur, sans vérifier
 * si cette valeur est comprise entre le valeurs mini et maxi.
 * @param {number} valeur
 * @returns {void}
 */
CVariableBornee.prototype.donneValeur = function (valeur) {
  this.valeurActuelle = valeur
}

// A revoir. Utilisé ?
/**
 * Retourne le nom du calcul
 * @returns {string}
 */
CVariableBornee.prototype.getNom = function () {
  return this.nomCalcul
}

CVariableBornee.prototype.read = function (inps, list) {
  CValDyn.prototype.read.call(this, inps, list)
  this.nomCalcul = inps.readUTF()
  this.valeurActuelle = inps.readDouble()
  this.valeurMini = inps.readDouble()
  this.valeurMaxi = inps.readDouble()
  this.valeurPas = inps.readDouble()
  this.dialogueAssocie = inps.readBoolean()
  this.chaineValeurMini = inps.readUTF()
  this.chaineValeurMaxi = inps.readUTF()
  this.chaineValeurPas = inps.readUTF()
}

CVariableBornee.prototype.write = function (oups, list) {
  CValDyn.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomCalcul)
  oups.writeDouble(this.valeurActuelle)
  oups.writeDouble(this.valeurMini)
  oups.writeDouble(this.valeurMaxi)
  oups.writeDouble(this.valeurPas)
  oups.writeBoolean(this.dialogueAssocie)
  oups.writeUTF(this.chaineValeurMini)
  oups.writeUTF(this.chaineValeurMaxi)
  oups.writeUTF(this.chaineValeurPas)
}
// Fonction créant dans le document un Div associé contenant l'affichage de la valeur de la variable
// et deux boutons + et - pour l'incrémenter et la décrémenter
// ind est l'indice dans la liste des variables associées à des boutons
/**
 * Fonction créant dans le document un foreign object associé contenant l'affichage de la valeur de la variable
 * et deux boutons + et - pour l'incrémenter et la décrémenter.
 * N'est appelée que si this.dialogueAssocie est true.
 * Le nom creeDiv a été gardé mais on ne crée pas un div mais un foreign object
 * @param {number} ind  L'indice de cette variable dans la liste des variables ayant un dialogue associé
 * en bas et à droite de la figure.
 * @returns {void}
 */
CVariableBornee.prototype.creeDiv = function (ind) {
  // Version 7.9.2 : On n'utilise plus un div mais un foreignObject
  // this.div = ce('div')
  const id = this.listeProprietaire.id
  this.foreignElt = cens('foreignObject', {
    style: 'overflow:visible;position:absolute;margin:0px;pointer-events:all'
  })
  this.foreignElt.setAttribute('x', '0') // Provisoire
  this.foreignElt.setAttribute('y', '0') // Provisoire
  let svgFig = ge(id)
  if (!svgFig) return // ça arrive en cas de pb de chargement latex où le svg est remplacé par un message d'erreur
  let parentDiv = svgFig.parentElement
  if (parentDiv?.tagName?.toLowerCase() === 'svg') parentDiv = parentDiv.parentElement
  const svgPanel = ge(this.listeProprietaire.id + 'figurePanel', true)
  if (svgPanel != null) {
    svgFig = svgPanel
  }
  // Il est nécessaire d'utiliser un tableau avec des td car sur tablettes les boutons se retrouvent à la ligne
  const tab = ce('table')
  // this.foreignElt.appendChild(tab)
  const tr = ce('tr')
  tab.appendChild(tr)
  // Affecter le style ci-dessous aux td créés ci-dessous est indispensable sinon il y a des différences
  // de rendu entre les versions electron et en ligne
  const styletd = 'padding:0px;font-style:9pt;line-height:1'
  let td = ce('td', {
    style: styletd
  })
  tr.appendChild(td)
  this.editeur = ce('input', {
    readOnly: 'true',
    style: 'font-size:9pt;padding:2px;border:1px solid grey;'
  })
  td.appendChild(this.editeur)
  this.editeur.name = this.listeProprietaire.id + this.nomCalcul
  this.updateDisplay()
  td = ce('td', {
    style: styletd
  })
  tr.appendChild(td)
  // Attention : Utiliser des inputs car si on utilise des buttons il ne faut pas utiliser value mais innerHtml
  this.buttonplus = ce('input', {
    type: 'button',
    value: '+'
  })
  td.appendChild(this.buttonplus)
  // Sur iPad un clic avec stylet sur le bouton peut provoquer à la fois un événement
  // touch et événement click d'où l'utilisation de this.type
  this.buttonplus.onclick = () => {
    if (this.type === 'touch') {
      this.type = ''
      return
    }
    this.type = 'mouse'
    this.onClickPlus()
  }
  this.buttonplus.ontouchstart = () => {
    if (this.type === 'mouse') {
      this.type = ''
      return
    }
    this.type = 'touch'
    this.onClickPlus()
  }
  td = ce('td', {
    style: styletd
  })
  tr.appendChild(td)
  this.buttonmoins = ce('input', {
    type: 'button',
    value: '-'
  })
  td.appendChild(this.buttonmoins)
  // Sur iPad un clic avec stylet sur le bouton peut provoquer à la fois un événement
  // touch et événement click d'où l'utilisation de this.type
  this.buttonmoins.onclick = () => {
    if (this.type === 'touch') {
      this.type = ''
      return
    }
    this.type = 'mouse'
    this.onClickMoins()
  }
  this.buttonmoins.ontouchstart = () => {
    if (this.type === 'mouse') {
      this.type = ''
      return
    }
    this.type = 'touch'
    this.onClickMoins()
  }
  td = ce('td', {
    style: styletd
  })
  tr.appendChild(td)
  this.buttonegal = ce('input', {
    type: 'button',
    value: '='
  })
  td.appendChild(this.buttonegal)
  // Sur iPad un clic avec stylet sur le bouton peut provoquer à la fois un événement
  // touch et événement click d'où l'utilisation de this.type
  this.buttonegal.onclick = () => {
    if (this.type === 'touch') {
      this.type = ''
      return
    }
    this.type = 'mouse'
    this.onClickEgal()
  }
  // Lignes suivantes nécessaires pour stylet sur iPad
  this.buttonegal.ontouchstart = () => {
    if (this.type === 'mouse') {
      this.type = ''
      return
    }
    this.type = 'touch'
    this.onClickEgal()
  }
  // On met dans x et y les dimensions de travail de la figure qui ont été mis dans le svg.dimWork
  // de la figure. En effet depuis la version 9, les dimensions de la figure peuvent dépasser le cadre de travail
  let x = parseInt(svgFig.dimWork.x) - 24
  let y = parseInt(svgFig.dimWork.y) - 15 // Pour compenser la présence d'un ascenseur éventuel
  // On ajoute d'abord le div au parent du SVG de la figure qui est div pour connaître sa taille puis on le retire
  // svgFig.appendChild(this.foreignElt)
  parentDiv.appendChild(tab) // Pour connaître les dimensions
  const width = tab.clientWidth
  const height = tab.clientHeight
  x = x - width
  y = y - height * (ind + 1)
  parentDiv.removeChild(tab)
  const attr = { x, y, width, height }
  setAttrs(this.foreignElt, attr)
  this.foreignElt.appendChild(tab)
  svgFig.appendChild(this.foreignElt)
  // Les lignes suivantes sont indipensables pour que le foreign object soit visible dans FireFox
}
/**
 * Fonction appelée quand l'utilisateur clique sur le bouton + du dialogue associé
 * à la variable (si this.dialogueAssocie est true).
 * Augmente la variable de la valeur de son pas.
 * @returns {void}
 */
CVariableBornee.prototype.onClickPlus = function () {
  const liste = this.listeProprietaire
  const id = liste.id
  const doc = liste.documentProprietaire
  // Modification version 6.3.0
  const svgApp = ge(id + 'figurePanel', true)
  const svg = svgApp ?? ge(id)
  const dimf = new Dimf(svg)
  this.incremente()
  liste.positionneDependantsDe(false, dimf, this)
  liste.setDependantsReady4MathJaxUpdate(this) // Ajout version 5.0.6
  addQueue(() => liste.updateDependants(this, svg, doc.couleurFond, true))
  // Ce code doit être après la mise sur la pile de updateDependants,
  // car updateDisplay (qui sera donc appelé avant updateDependants) peut ajouter des actions sur la pile
  this.updateDisplay()
}
/**
 * Fonction appelée quand l'utilisateur clique sur le bouton - du dialoge associé
 * à la variable (si this.dialogueAssocie est true).
 * Diminue la variable de la valeur de son pas.
 * @returns {void}
 */
CVariableBornee.prototype.onClickMoins = function () {
  const liste = this.listeProprietaire
  const id = liste.id
  const doc = liste.documentProprietaire
  const svgApp = ge(id + 'figurePanel', true)
  const svg = svgApp ?? ge(id)
  const dimf = new Dimf(svg)
  this.decremente()
  liste.positionneDependantsDe(false, dimf, this)
  liste.setDependantsReady4MathJaxUpdate(this) // Ajout version 5.0.6
  addQueue(() => liste.updateDependants(this, svg, doc.couleurFond, true))
  // FIXME expliquer pourquoi il faut lancer ça avant updateDependants
  this.updateDisplay()
}

/**
 * On définit cette fonction pour qu'on puisse l'appeler dans le cas d'un mtgAppLecteur
 * sur lequel a été appliquée l'API car dans ce cas CVariableBornee.prototype.onClickEgal
 * a été écrasé par la version contenue dans le fichier CVariableBorneeAdd.js
 */
CVariableBornee.prototype.onClickEgalBase = function () {
  const ch = getStr('var1') + this.nomCalcul + '\n' + getStr('var2') + this.valeurMini + getStr('et') + this.valeurMaxi
  // On n'utilise pas de boîte de dialogue car on peut être dans le player
  const va = prompt(ch, this.valeurActuelle)
  if (va === null) return
  const val = parseFloat(va)
  if (!isFinite(val) || (val < this.valeurMini) || (val > this.valeurMaxi)) {
    // On n'utilise pas AvertDlg car on peut être dans le player
    alert(getStr('invalidEntry'))
    return
  }
  this.donneValeur(val)
  const list = this.listeProprietaire
  const id = list.id
  const doc = list.documentProprietaire
  const svgApp = ge(id + 'figurePanel', true)
  const svg = svgApp ?? ge(id)
  const dimf = new Dimf(svg)
  list.initialiseDependances()
  list.positionneDependantsDe(false, dimf, this)
  list.metAJourObjetsDependantDe(this)
  // Il faut rappeler positionneDependantsDe, par exemple pour recalculer les dérivées,
  // et avec un dernier paramètre à true
  // pour que positionneFull soit appelé pour chaque élément dépendant de el
  // (important pour une matrice ayant des termes dépendants d'une dérivée partielle qui vient d'être recalculée)
  list.positionneDependantsDe(false, dimf, this, true)
  // Le deuxième positionnement des CLaTeX dépendant de el a mis leur membre isToBeUpdated
  // à false et il faut le remettre à true pour qu'ils soient réaffichés
  // car ces dérivées n'ont été mises à jour que dans metAJourObjetsDependantDe
  list.setDependantLatexToBeUpdated(this)
  list.updateDependants(this, svg, doc.couleurFond, true)
  this.updateDisplay()
}

/**
 * Fonction appelée quand l'utilisateur clique sur le bouton = du dialoge associé
 * à la variable (si this.dialogueAssocie est true).
 * Fait apparaître une boîte de dialogue permettant de modifier la valeur actuelle
 * de la variable. La valeur entrée n'est affectée à valeurActuelle que si elle est
 * comprise entre les valeurs mini et maxi.
 * Est redéfini dans CVariableBorneeAdd pour la version mtgloader
 * @type {voidFn}
 */
CVariableBornee.prototype.onClickEgal = CVariableBornee.prototype.onClickEgalBase
/**
 * Fonction remettant à jour l'affichage en bas et à droite de la figure du dialogue associé
 * à la variable (ne peut être appelé que si this.dialogueAssocie est true).
 * @returns {void}
 */
CVariableBornee.prototype.updateDisplay = function () {
  if (this.dialogueAssocie) this.editeur.value = this.nomCalcul + ' = ' + this.rendChaineValeur(12)
}

/**
 * Fonction détruisant le div représentant le dialogue affiché en bas et à droite de la figure et associé
 * à la variable, avec les bouton +, - et = associés.
 * Ne peut être appelée que si this.dialogeAssocie est true.
 * @returns {void}
 */
CVariableBornee.prototype.deleteComponent = function () {
  try {
    if (this.foreignElt) {
      this.foreignElt.parentNode.removeChild(this.foreignElt)
      this.foreignElt = null
    }
  } catch (ex) { /* on ignore volontairement */ }
}

/**
 * Cette fonction renvoie true pour les objets qui implémentent dans la figure une élément "externe"
 * sous la forme d'un foreign Objet foreignElt
 * @return {boolean}
 */
CVariableBornee.prototype.hasComponent = function () {
  return this.dialogueAssocie
}

/**
 * @callback voidFn
 * @return {void}
 */
