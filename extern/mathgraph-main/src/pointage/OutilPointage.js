/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
export default OutilPointage
/**
 * Outil ancêtre de tous les outils servant à lancer une action lors d'une action sur la figure
 * avec la souris
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointage (app) {
  this.app = app
}
/**
 * Renvoie la liste d'objets utilisée par l'outil
 * @returns {CListeObjets}
 */
OutilPointage.prototype.listeUtilisee = function () {
  // return this.app.listePr;
  return this.app.listePourConst
}
/**
 * Fonction réinitialisant l'outil
 */
OutilPointage.prototype.reset = function () {
}
/**
 * Fonction appelée lors d'un clic gauche sur la souris
 * Ne fait rien par défaut
 * @param {MouseEvent} evt  L'événement souris
 */
OutilPointage.prototype.mousedown = function (evt) {
}
/**
 * Fonction appelée lors d'un mouvement de la souris sur la figure
 * Ne fait rien par défaut
 * @param {MouseEvent} evt  L'événement souris
 */
OutilPointage.prototype.mousemove = function (evt) {
}
/**
 * Fonction appelée lors d'un relâchement du bouton de la souris
 * Ne fait rien par défaut
 * @param {MouseEvent} evt  L'événement souris
 */
OutilPointage.prototype.mouseup = function (evt) {
}
/**
 * Fonction appelée lors d'un appui sur écran de mobile
 * Ne fait rien par défaut
 * @param {TouchEvent} evt
 */
OutilPointage.prototype.touchstart = function (evt) {
}
/**
 * Fonction appelée lors déplacement de doigt sur écran de mobile
 * Ne fait rien par défaut
 * @param {TouchEvent} evt
 */
OutilPointage.prototype.touchmove = function (evt) {
// Ne fait rien par défaut
}
/**
 * Fonction appelée lors relâchement de doigt sur écran de mobile
 * Ne fait rien par défaut
 * @param {TouchEvent} evt
 */
OutilPointage.prototype.touchcancel = function (evt) {
// Ne fait rien par défaut
}
/**
 * Fonction appelée lors relâchement de doigt sur écran de mobile
 * Ne fait rien par défaut
 * @param {TouchEvent} evt
 */
OutilPointage.prototype.touchend = function (evt) {
// Ne fait rien par défaut
}
