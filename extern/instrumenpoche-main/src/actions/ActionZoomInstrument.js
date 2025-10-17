/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionZoomInstrument
/**
 * Action zoomant sur un instrument
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc
 * @param {InstrumentAncetre} instrument
 * @param {string} zoomfin Le zoom de fin (de 0 à 100)
 * @param {string} tempo Le tempo de factorisation
 * @param {string} vitesse Facteur de rapidité de l'animation
 */
function ActionZoomInstrument (doc, instrument, zoomfin, tempo, vitesse) {
  ActionAncetre.call(this, doc, tempo)
  this.instrument = instrument
  this.zoomfin = parseFloat(zoomfin) / 100
  this.vitesse = parseInt(vitesse)
}
ActionZoomInstrument.prototype = new ActionAncetre()

ActionZoomInstrument.prototype.execute = function (immediat) {
  if (!immediat) this.instrument.lanceAnimationZoom(this.zoomfin, this.vitesse)
  else {
    this.instrument.zoomfactor = this.zoomfin
    this.instrument.positionne()
    // this.doc.actionSuivante(immediat);
  }
}
/** @inheritDoc */
ActionZoomInstrument.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
