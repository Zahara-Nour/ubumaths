/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionCoucherCompas
/**
 * Action couchant le compas.
 * @extends ActionAncetre
 * @constructor
 * @param {iepDoc} doc
 */
function ActionCoucherCompas (doc, tempo) {
  ActionAncetre.call(this, doc, tempo)
}
ActionCoucherCompas.prototype = new ActionAncetre()

/**
 * Fonction couchant le compas et le montrant si immediat est false
 * @param {boolean} immediat
 */
ActionCoucherCompas.prototype.execute = function (immediat) {
  const compas = this.doc.compas
  const compasLeve = this.doc.compasLeve
  if (compas.leve) {
    compasLeve.montre(false)
    compas.setPosition(compasLeve.x, compasLeve.y, compasLeve.angle)
  }
  if (!immediat && compas.visible) compas.montre(true)
  compas.leve = false
  if (!immediat) this.doc.actionSuivante(immediat)
}
/** @inheritDoc */
ActionCoucherCompas.prototype.actionVisible = function () {
  const visible = this.doc.getInstrumentVisibility(this.doc.compas.compas, this.indice - 1)
  if (!visible) return false
  else return this.doc.getCompasStatus(this.indice - 1) === 'leve'
}
