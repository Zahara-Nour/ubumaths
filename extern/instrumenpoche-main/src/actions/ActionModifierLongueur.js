/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionModifierLongueur
/*
 * Action modifiant la longueur d'un instrument.
 * Pour le moment seulement implémenté pour la règle.
 */

/**
 * Action modifiant la longueur d'un instrument.
 * Pour le moment seulement implémenté pour la règle.
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} Le document propriétaire
 * @param {InstrumentAncetre} instrument L'istrument sur lequel a lieu l'action
 * @param {string} longueur La nouvelle longueur
 * @param {string} tempo Le tempo de temporisation
 */
function ActionModifierLongueur (doc, instrument, longueur, tempo) {
  ActionAncetre.call(this, doc, tempo) // null car action immédiate
  this.instrument = instrument
  this.longueur = longueur
}
ActionModifierLongueur.prototype = new ActionAncetre()
/**
 * Fonction exécutant l'action et modifiant la longueur de l'instrument
 * @param {boolean} immediat true si l'action est immdiate et on ne passe
 * pas ensuite à l'action suivante
 */
ActionModifierLongueur.prototype.execute = function (immediat) {
  if (this.instrument === this.doc.regle) {
    const vis = this.instrument.visible
    this.instrument.longueur = this.longueur
    const oldg = this.instrument.g
    this.instrument.creeg()
    this.instrument.g.setAttribute('visibility', vis ? 'visible' : 'hidden')
    this.doc.svg.replaceChild(this.instrument.g, oldg)
    this.instrument.translate(this.instrument.x, this.instrument.y)
  }
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionModifierLongueur.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.instrument, this.indice - 1)
}
