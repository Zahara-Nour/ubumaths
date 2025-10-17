/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */

/**
 * Informations sur un texte contenant des balises <b> ou <i> ou <u> ou <font> (ou un mélange)
 * Utilisé dans l'objet ActionEcrireTexte.
 * @constructor
 * @param {boolean} bold
 * @param {boolean} italic
 * @param {boolean} underline
 * @param {boolean} couleur
 * @param {boolean} fontface
 * @param {boolean} taille
 */
function InfoBalise (bold, italic, underline, couleur, fontface, taille) {
  this.bold = bold
  this.italic = italic
  this.underline = underline
  this.couleur = couleur
  this.fontface = fontface
  this.taille = taille
}

export default InfoBalise
