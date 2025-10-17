/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
import CompasLeve from '../instruments/CompasLeve'
export default ActionLeverCompas
/**
 * Action levant le compas
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 */
function ActionLeverCompas (doc, tempo) {
  ActionAncetre.call(this, doc, tempo)
}
ActionLeverCompas.prototype = new ActionAncetre()

/**
 * Fonction cachant le compas normal et créant un compas couché qui est ensuite affiché
 * si le compas est visible
 * @param {string} immediat true dans le cas d'une exécution sans passage à l'action suivante
 */
ActionLeverCompas.prototype.execute = function (immediat) {
  const compas = this.doc.compas
  if (compas.visible) {
    compas.montre(false)
    compas.visible = true // Car a été modifié par montre()
  }
  this.doc.compasLeve = new CompasLeve(this.doc, compas.x, compas.y,
    compas.angle, compas.ecart)
  if (!immediat && compas.visible) this.doc.compasLeve.montre(true)
  compas.leve = true
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionLeverCompas.prototype.actionVisible = function () {
  const visible = this.doc.getInstrumentVisibility(this.doc.compas, this.indice - 1)
  if (!visible) return false
  else return this.doc.getCompasStatus(this.indice - 1) === 'couche'
}
