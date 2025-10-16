/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
export default ChoixObjProchesDlg

/**
 * Dialogue permettant, une fois qu'on connait le type d'objet désiré et qu'on sait qu'il ya au poins deux objets
 * de ce type proches du pointeur souris, de choisir l'objet désiré via une liste.
 * @param {MtgApp} app L'application propriétaire
 * @param {OutilPointage} outilPointage l'outil en cours d'utilisation qaund on appelle la boîte de dialogue
 * @param {string} cible Le nom de l'objet de pointage auquel il faudra affecter le premier élément ou le dernier
 * @param {Nat} typeCherche la nature des objets cherchés
 * @param {Point} point les coordonnées dont on cherche les objets proches
 * @param {CListeObjets} listeExclusion une liste formée des objets éventuels ne pouvant pas être désignés
 * @param {string} deviceType la chaîne 'mouse' ou 'touch" suivant le type de ppériphérique
 * @param {boolean} bmodifiableParMenu true si on ne veut que des objets modifiables par menu
 * @param {boolean} bMemeMasque true si on accepte aussi de chercher parmi les objets masqués
 * @param {function} callBackOK fonction de callBack à appeler une fois qu"on a appuyé sur le bouton OK
 * @constructor
 */
function ChoixObjProchesDlg (app, outilPointage, cible, typeCherche, point, listeExclusion,
  deviceType, bmodifiableParMenu, bMemeMasque, callBackOK) {
  MtgDlg.call(this, app, 'choixObjDlg', callBackOK)
  this.outilPointage = outilPointage
  this.cible = cible
  const list = app.listePr
  this.ar = list.getTabObjProches(typeCherche, point, listeExclusion, deviceType, bmodifiableParMenu, bMemeMasque)
  // tab contient des pointeurs vers les objets proches
  const tab = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tab)
  const tr = ce('TR')
  tab.appendChild(tr)
  let td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('ChoixEntre'))
  td.appendChild(label)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  this.select = ce('select', {
    size: 10, // Le nombre de lignes visibles par défaut
    style: 'width:500px'
  })
  td.appendChild(this.select)
  // C'est là qu'on ajoute tous les objets proches disponibles dans la liste déroulante
  for (let i = 0; i < this.ar.length; i++) {
    const option = ce('Option')
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.ar[i].info())
    this.select.appendChild(option)
  }
  this.create('ChoixOb', 600)
}

ChoixObjProchesDlg.prototype = new MtgDlg()

ChoixObjProchesDlg.prototype.OK = function () {
  const i = this.select.selectedIndex
  this.outilPointage[this.cible] = this.ar[i]
  if (this.callBackOK !== null) this.callBackOK()
  this.destroy()
}
