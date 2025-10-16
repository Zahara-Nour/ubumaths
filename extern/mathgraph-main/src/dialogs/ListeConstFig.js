/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { ce } from 'src/kernel/dom'
import ListeMacros from './ListeMacros'

export default ListeConstFig

/**
 *
 * @param {MtgApp} app
 * @param callBackOnChange
 * @constructor
 */
function ListeConstFig (app, callBackOnChange = null) {
  this.app = app
  let i
  const tablePrototypes = app.doc.tablePrototypes
  const nbConst = tablePrototypes.length
  this.int = []
  this.pointeurs = []
  this.select = ce('select', {
    size: 4, // Le nombre de lignes visibles par défaut
    style: 'width:250px'
  })

  for (i = 0; i < nbConst; i++) {
    const proto = tablePrototypes[i]
    this.pointeurs.push(proto)
    this.int.push(proto.nom)
    const option = ce('option', {
      class: 'mtgOption'
    })
    $(option).html(proto.nom)
    this.select.appendChild(option)
  }
  if (callBackOnChange) this.select.onchange = callBackOnChange
}

ListeConstFig.prototype = new ListeMacros()
