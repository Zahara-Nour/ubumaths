/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
export default ActionAncetre
/**
 * Action ancetre de toutes les actions de la figure
 * @constructor
 * @param {IepDoc} doc le document contenant les objets
 * @param {string|number} [tempo] Le délai d'attente à la fin de l'action en dixièmes de seconde, sinon on passe directement à l'action suivante.
 */
function ActionAncetre (doc, tempo) {
  if (arguments.length === 0) return
  /** @type {IepDoc} */
  this.doc = doc
  if (typeof tempo === 'string') tempo = Number(tempo)
  /** @type {number} */
  this.tempo = (typeof tempo === 'number' && tempo > 0 && Number.isFinite(tempo)) ? tempo * 100 : null
  /** @type {boolean} */
  this.isReady = false // Sera mis à true une fois qu'on est sûr que l'élément est bien chargé et prêt.
}
/**
 * Retourne lorsque l'action a été chargé et prête.
 * Est redéfini pour les actions dont le chargement est asynchrone : images et actions
 * d'écriture de texte nécessitant l'utilisation du LaTeX.
 */
ActionAncetre.prototype.setReady = function () {
  this.isReady = true
}
/**
 * Fonction qui n'aura une action que pour les actions de création d'objet et créera l'élément graphique
 * du DOM associé Sera redéfini pour les actions de création d'objet
 */
ActionAncetre.prototype.creegElement = function () {
}
/**
 * Retourne true seulement si l'action a une action visible sur la figure.
 * Lors de l'appel de iepDoc.ajouteAction, chaque action se voit attribuer un membre indice
 * qui est son indice dans la liste des actions créées..
 * Renvoie true par défaut.
 * @returns {boolean}
 */
ActionAncetre.prototype.actionVisible = function () {
  return true
}
