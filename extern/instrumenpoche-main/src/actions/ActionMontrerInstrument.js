/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMontrerInstrument
/**
 * Action montrant un instrument.
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {InstrumentAncetre} instrument l'instrument à montrer
 */
function ActionMontrerInstrument (doc, instrument, x, y, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.x = (x === null) ? null : parseFloat(x)
  this.y = (y === null) ? null : parseFloat(y)
  this.instrument = instrument
}
ActionMontrerInstrument.prototype = new ActionAncetre()
/**
 * Fonction montrant l'instrument instrument
 * @param {boolean} immediat si rrue on ne passe pas à l'action suivante
 */
ActionMontrerInstrument.prototype.execute = function (immediat) {
  const compas = this.doc.compas
  if ((this.x !== null) && (this.y !== null)) this.instrument.translate(this.x, this.y)
  if ((this.instrument === compas) && !immediat) {
    if (!compas.leve) compas.montre(true)
    else this.doc.compasLeve.montre(true)
    compas.visible = true
  } else this.instrument.montre(true)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMontrerInstrument.prototype.actionVisible = function () {
  return !this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
