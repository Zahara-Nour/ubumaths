/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
export default ActionTranslationObjet
/**
 * Action translatant un objet
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc
 * @param {string} idel L'id de l'objet à translater
 * @param {string} xfin l'abscisse de fin de translation
 * @param {string} yfin L'ordonnée de fin de translation
 * @param {string} type le type de l'objet
 * @param {string} tempo Le tempo de temporisation
 * @param {string} pix10 Le nombre de pixels pour la translation par dixième de seconde. Peut être null
 */
function ActionTranslationObjet (doc, idel, xfin, yfin, type, tempo, pix10) {
  ActionAncetre.call(this, doc, tempo)
  this.xfin = parseFloat(xfin)
  this.yfin = parseFloat(yfin)
  this.pix10 = (pix10 == null) ? 8 : parseFloat(pix10)
  this.type = type
  this.objet = this.doc.getElement(idel, type)
}
ActionTranslationObjet.prototype = new ActionAncetre()

/**
 * Fonction lançant la translation de objet sauf si immediat est false
 * @param {boolean} [immediat=false]
 */
ActionTranslationObjet.prototype.execute = function (immediat) {
  const objet = this.objet
  if (objet == null) {
    this.doc.actionSuivante(immediat)
    return
  }
  if (!immediat) objet.lanceAnimationTranslation(this.xfin, this.yfin, this.pix10)
  else {
    objet.translate(this.xfin, this.yfin)
  }
}
/** @inheritDoc */
ActionTranslationObjet.prototype.actionVisible = function () {
  return this.doc.getObjectVisibility(this.objet, this.indice - 1)
}
