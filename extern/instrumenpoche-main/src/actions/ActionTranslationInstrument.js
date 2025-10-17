/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionTranslationInstrument
/**
 * Action de translation d'un instrument
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {InstrumentAncetre} instrument l'instrument à translater
 * @param {string} xfin l'abscisse de fin de translation
 * @param {string} yfin l'ordonnée de fin de translation
 * @param {number} tempo le tempo (peut être null)
 * @param {number} pix10 Le nombre de pixels par dixième de seconde pour la translation
 * Sera
 */
function ActionTranslationInstrument (doc, instrument, xfin, yfin, tempo, pix10) {
  ActionAncetre.call(this, doc, tempo)
  this.instrument = instrument
  this.xfin = parseFloat(xfin)
  this.yfin = parseFloat(yfin)
  this.pix10 = (pix10 == null) ? 8 : parseFloat(pix10)
}
ActionTranslationInstrument.prototype = new ActionAncetre()

ActionTranslationInstrument.prototype.execute = function (immediat) {
  if (isNaN(this.xfin) || isNaN(this.yfin)) this.doc.actionSuivante(immediat)
  else {
    if (immediat) this.instrument.translate(this.xfin, this.yfin)
    else this.instrument.lanceAnimationTranslation(this.xfin, this.yfin, this.pix10)
  }
}
/** @inheritDoc */
ActionTranslationInstrument.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
