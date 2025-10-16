/*
 * Created by yvesb on 01/02/2017.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { ce } from 'src/kernel/dom'

export default ListeTailles

/**
 * Objet représentant une liste de toutes les tailles possibles pour le nom d'un point ou une droite
 * @constructor
 * @param tailleInit La taille a sélectionner par défaut dan sla liste
 */
function ListeTailles (tailleInit) {
  this.select = ce('select', {
    size: 4 // Le nombre de lignes visibles par défaut
  })
  for (let i = 10; i <= 80; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === tailleInit) option.setAttribute('selected', 'selected')
    $(option).html(i)
    this.select.appendChild(option)
  }
}

/**
 * Fonction renvoyant le composant select représentant la liste
 * @returns {Element|*}
 */
ListeTailles.prototype.getComponent = function () {
  return this.select
}

/**
 * Fonction renvoyant la taille sélectionnée dans la liste
 * @returns {number}
 */
ListeTailles.prototype.getTaille = function () {
  const ind = this.select.selectedIndex
  return ind + 10
}
