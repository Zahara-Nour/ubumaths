/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMontrerGraduations
/**
 * Action montrant ou masquant les graduations de l'instrument instrument
 * Attention : Pour la rèle, cette action s'exerce sur la graduation
 * et pour le rapporteur, sur la graduation interne
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {InstrumentAncetre} instrument l'instrument possédant les graduations
 * @param {boolean} bmontrer true pour montrer les graduations, false pour les cacher
 * @param {number} tempo
 */
function ActionMontrerGraduations (doc, instrument, bmontrer, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.instrument = instrument
  this.bmontrer = bmontrer
}
ActionMontrerGraduations.prototype = new ActionAncetre()
/**
 * Fonction exécutant l'action donc montrant ou masquant les graduations de instrument
 * @param {boolean} immediat Si true,pas de passage à l'action suivante
 */
ActionMontrerGraduations.prototype.execute = function (immediat) {
  this.instrument.montreGraduations(this.bmontrer)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMontrerGraduations.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
