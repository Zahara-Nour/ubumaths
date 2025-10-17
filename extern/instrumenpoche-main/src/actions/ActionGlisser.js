/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionGlisser
/**
 * Action faisant glisser l'équerre de la règle équerre
 * @constructor
 * @extends ActionAncetre
 * @param {IepDoc} doc le document propriétaire
 * @param {int} abscisseFin l'abscisse de fin de déplacement
 * @param {string} tempo le tempo en dixième de seconde (ou null)
 * @param {string} pix10 le nombre de pixels de déplacement à chaque dixième de seconde
 */
function ActionGlisser (doc, abscisseFin, tempo, pix10) {
  ActionAncetre.call(this, doc, tempo)
  this.abscisseFin = parseFloat(abscisseFin)
  this.pix10 = (pix10 === null) ? 8 : String(Math.abs(pix10))
}
ActionGlisser.prototype = new ActionAncetre()
/**
 * Fonction lançant une animation de glissement de la règle équerre sauf si immediat est true
 * @param {boolean} [immediat=false]
 */
ActionGlisser.prototype.execute = function (immediat) {
  if (!immediat) this.doc.requerre.lanceAnimationGlissement(this.abscisseFin, this.pix10)
  else {
    this.doc.requerre.setAbs(this.abscisseFin)
    this.doc.requerre.positionne()
    // this.doc.actionSuivante(immediat);
  }
}
/** @inheritDoc */
ActionGlisser.prototype.actionVisible = function () {
  return this.doc.getInstrumentVisibility(this.doc.requerre, this.indice - 1)
}
