/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionRetourner
/**
 * Action de retournement du compas
 * @extends ActionAncetre
 * @constructor
 * @param {iepDoc} doc
 * @param {number} tempo
 */
function ActionRetourner (doc, tempo) {
  ActionAncetre.call(this, doc, tempo)
}
ActionRetourner.prototype = new ActionAncetre()

/**
 * Exécution de l'action de retournement du compas
 * @param {boolean} immediat Si true on ne passe pas à l'action suivante
 */
ActionRetourner.prototype.execute = function (immediat) {
  this.doc.compas.retourne()
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionRetourner.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.doc.compas, this.indice - 1)
}
