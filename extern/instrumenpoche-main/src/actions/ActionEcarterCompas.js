/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'

export default ActionEcarterCompas

/**
 * Écarte le compas
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc
 * @param ecartement
 * @param tempo
 * @param ec10
 */
function ActionEcarterCompas (doc, ecartement, tempo, ec10) {
  ActionAncetre.call(this, doc, tempo)
  this.ecartement = ecartement
  this.ec10 = (ec10 === null) ? 16 : parseFloat(ec10)
}

ActionEcarterCompas.prototype = new ActionAncetre()

ActionEcarterCompas.prototype.execute = function (immediat) {
  if (!immediat) {
    this.doc.compas.lanceAnimationEcartement(this.ecartement, this.ec10)
  } else {
    this.doc.compas.ecart = this.ecartement
    this.doc.compas.positionne()
  }
}

ActionEcarterCompas.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.doc.compas, this.indice - 1)
}
