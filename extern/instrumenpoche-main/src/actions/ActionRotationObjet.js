/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionRotationObjet
/**
 * Action de rotation d'un objet
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc le document proprétaire
 * @param {string} idel l'id de l'objet à faire tourner
 * @param {string} anglefin l'angle de fin de rotation
 * @param {string} type le type de l'objet à faire tourner "image"
 * ou "texte" (la possibilité de tourner un texte n'était pas présnete
 * dans la version Flash)
 * car seules les images ont des objets que l'on peut faire tourner)
 * @param {string} tempo  le tempo de temporisation (peut être null)
 * @param {string} deg10 Le pas d'incrémentation de l'angle par dixième de seconde
 * Vaudra 8 si  null
 */
function ActionRotationObjet (doc, idel, anglefin, type, tempo, deg10) {
  ActionAncetre.call(this, doc, tempo)
  this.anglefin = parseFloat(anglefin)
  this.deg10 = (deg10 == null) ? 8 : Math.abs(parseFloat(deg10))
  this.objet = this.doc.getElement(idel, type)
}
ActionRotationObjet.prototype = new ActionAncetre()

/**
 * Fonction lançant l'animation de l'objet seulement si immediat est false;
 * @param {boolean} immediat
 */
ActionRotationObjet.prototype.execute = function (immediat) {
  const objet = this.objet
  if (objet == null) {
    if (!immediat) this.doc.actionSuivante(immediat)
    return
  }
  if (!immediat) objet.lanceAnimationRotation(this.anglefin, this.deg10, this.tempo)
  else {
    objet.angle = this.anglefin
    objet.positionne()
    // this.doc.actionSuivante(immediat);
  }
}
/** @inheritDoc */
ActionRotationObjet.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
