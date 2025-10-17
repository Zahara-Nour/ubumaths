/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionPause
/**
 * Action faisant une pause dans l'animation de la figure
 * Pour continuer l'action  l'utilisation doit cliquer sur le bouton rouge dans
 * la barre d'icônes
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {string} tempo le tempo de temporisation (ou null)
 */
function ActionPause (doc, tempo) {
  ActionAncetre.call(this, doc, tempo)
}
ActionPause.prototype = new ActionAncetre()
/**
 * Exécute l'action en suspendant l'animation en cours.
 * Pour continuer, l'utilisateur doit cliquer sur le bouton roouge.
 * @param {boolean} [immediat=false]
 */
ActionPause.prototype.execute = function (immediat) {
  if (!immediat) {
    this.doc.activeIconeContinuer()
    this.doc.animationEnCours = false
  }
}
/** @inheritDoc */
ActionPause.prototype.actionVisible = function () {
  return false
}
