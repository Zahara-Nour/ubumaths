/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMontrerNombres
// Cette action agit sur les graduations externes du rapporteur
/**
 * Action montrant changeant le statut des gradiations externes du rapporteur
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {boolean} bmontrer true si on montre les graduations, false sinon
 * @param {number} tempo
 */
function ActionMontrerNombres (doc, bmontrer, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.bmontrer = bmontrer
}
ActionMontrerNombres.prototype = new ActionAncetre()
/**
 * Exécution de l'action changeant le statut des gradiations externes du rapporteur
 * @param {boolean} immediat si true on ne passe pas à l'action suivante
 */
ActionMontrerNombres.prototype.execute = function (immediat) {
  this.doc.rapporteur.montreGraduationsExternes(this.bmontrer)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMontrerNombres.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.doc.rapporteur, this.indice - 1)
}
