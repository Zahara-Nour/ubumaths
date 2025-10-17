/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionMasquer
/**
 * Action masquant un objet.
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {ObjetBase} objet l'objet à masquer
 */
function ActionMasquer (doc, idel, nature, tempo) {
  ActionAncetre.call(this, doc, tempo)
  this.objet = this.doc.getElement(idel, nature)
}
ActionMasquer.prototype = new ActionAncetre()
/**
 * Fonction exécutant le masque de l'objet objet
 * @param {boolean} immediat true en cas d'exécution immédiate sans passage
 * à l'action suivante
 */
ActionMasquer.prototype.execute = function (immediat) {
  const el = this.objet
  if (el != null) el.montre(false)
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionMasquer.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
