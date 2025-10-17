/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionZoomObjet
/**
 * Action zoomant sur un objet
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc Le document propriétaire
 * @param {Stirng} idel
 * @param {string} zoomfin L'id de l'objet sur lequel on zoome
 * @param {string} type Le type de l'objet
 * @param {string} tempo Le tempo de factorisation
 * @param {string} vitesse Facteur de vitesse pour l'animation
 */
function ActionZoomObjet (doc, idel, zoomfin, type, tempo, vitesse) {
  ActionAncetre.call(this, doc, tempo)
  this.objet = this.doc.getElement(idel, type)
  this.zoomfin = parseFloat(zoomfin) / 100
  this.vitesse = vitesse
  this.type = type
}
ActionZoomObjet.prototype = new ActionAncetre()
/**
 * Fonction lançant l'animation de zoom de l'objet sauf si immediat est false
 * @param {boolean} [immediat=false]
 */
ActionZoomObjet.prototype.execute = function (immediat) {
  const objet = this.objet
  if (objet == null) {
    this.doc.actionSuivante(immediat)
    return
  }
  if (!immediat) objet.lanceAnimationZoom(this.zoomfin, this.vitesse)
  else {
    objet.zoomfactor = this.zoomfin
    objet.positionne()
    // this.doc.actionSuivante(immediat);
  }
}
/** @inheritDoc */
ActionZoomObjet.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
