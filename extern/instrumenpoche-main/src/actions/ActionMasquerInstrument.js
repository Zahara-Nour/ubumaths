/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMasquerInstrument
/**
 * Action masquant un instrument.
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {InstrumentAncetre} instrument l'instrument à masquer
 */
function ActionMasquerInstrument (doc, instrument, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.instrument = instrument
}
ActionMasquerInstrument.prototype = new ActionAncetre()
/**
 * Fonction exécutant l'action et masquanf l'instrument instrument
 * @param {boolean} [immediat=false]
 */
ActionMasquerInstrument.prototype.execute = function (immediat) {
  const compas = this.doc.compas
  this.instrument.montre(false)
  if (compas.leve) this.doc.compasLeve.montre(false)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMasquerInstrument.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
