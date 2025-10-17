/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionModificationRayon

/**
 * Action modifiant le rayon d'un arc de cercle.
 * A ma connaissance n'a été utilisé que pour l'objet Gabarit
 * @param {IepDoc} doc
 * @param {string} idel L'id de l'objet dont il faut modifier le rayon
 * @param {string} rayFin Le rayon à la fin de l'animation
 * @param {string} type le type de l'objet
 * @param {string} tempo Le tempo de temporisation
 * @param {string} pix10 Le nombre de pixels pour la translation par dixième de seconde. Peut être null
 * @constructor
 */
function ActionModificationRayon (doc, idel, rayFin, type, tempo, pix10) {
  ActionAncetre.call(this, doc, tempo)
  this.rayFin = parseFloat(rayFin)
  this.pix10 = (pix10 == null) ? 8 : parseFloat(pix10)
  this.type = type
  this.objet = this.doc.getElement(idel, type)
}
ActionModificationRayon.prototype = new ActionAncetre()

/**
 * Fonction lançant la translation de objet sauf si immediat est false
 * @param {boolean} [immediat=false]
 */
ActionModificationRayon.prototype.execute = function (immediat) {
  const objet = this.objet
  if (objet == null) {
    this.doc.actionSuivante(immediat)
    return
  }
  if (!immediat) objet.lanceAnimationModificationRayon(this.rayFin, this.pix10)
  else {
    objet.donneRayon(this.rayFin)
  }
}
/** @inheritDoc */
ActionModificationRayon.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
