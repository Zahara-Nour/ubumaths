/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionRotationInstrument
/**
 * Action de rotation d'un instrument
 * A noter que le paramètre correspondant à la vitesse s'appelle sens
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {InstrumentAncetre} instrument l'instrument à tourner
 * @param {string} anglefin l'angle de fin
 * @param {string} tempo  le tempo de temporisation (ou null)
 * @param {string} deg10 le nombre de degrés à tourner à chaque dizième de seconde
 * ou null( sera alors de 8)
 */
function ActionRotationInstrument (doc, instrument, anglefin, tempo, deg10) {
  ActionAncetre.call(this, doc, tempo)
  this.instrument = instrument
  this.anglefin = parseFloat(anglefin)
  this.deg10 = (deg10 == null) ? 8 : Math.abs(parseFloat(deg10))
}

ActionRotationInstrument.prototype = new ActionAncetre()
/**
 * Fonction lançant l'animation de rotation de l'instrument si immediat est false
 * @param {boolean} immediat
 */
ActionRotationInstrument.prototype.execute = function (immediat) {
  if (!immediat) this.instrument.lanceAnimationRotation(this.anglefin, this.deg10)
  else {
    this.instrument.angle = this.anglefin
    this.instrument.positionne()
    if (!immediat) this.doc.actionSuivante(immediat)
  }
}
/** @inheritDoc */
ActionRotationInstrument.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
