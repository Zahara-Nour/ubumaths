/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMontrer
/**
 * Action montrant un objet.
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {ObjetBase} objet l'objet à démasquer
 */
function ActionMontrer (doc, idel, nature, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.objet = this.doc.getElement(idel, nature)
}
ActionMontrer.prototype = new ActionAncetre()
/**
 * Fonction démasquant l'élément graphique de l'objet objet
 * @param {boolean} [immediat=false]
 */
ActionMontrer.prototype.execute = function (immediat) {
  const el = this.objet
  if (el !== null) el.montre(true)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMontrer.prototype.actionVisible = function () {
  return !this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
