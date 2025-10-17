/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ObjetBase from '../objets/ObjetBase'
export default Ligne
/**
 * Classe ancêtre de tous les objets de type ligne
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propriétaire de l'objet
 * @param {string} id l'id de l'objet dans le fichier XML de la figure
 * @param {string} couleur la couleur de l'objet
 * @param {string} epaisseur l'épaisseur de trait
 * @param {string} opacite l'opacité du trait
 * @param {string} styleTrait "tiret" pour avoir des pointillés
 */
function Ligne (doc, id, couleur, epaisseur, opacite, styleTrait) {
  ObjetBase.call(this, doc, id, couleur)
  this.epaisseur = epaisseur
  this.opacite = (arguments.length >= 5) ? opacite : '100'
  this.styleTrait = (arguments.length >= 6) ? styleTrait : 'continu'
  const op = parseFloat(this.opacite / 100)
  this.style = 'stroke:' + couleur + ';stroke-width:' + epaisseur +
          ';stroke-opacity:' + op + ';stroke-linecap:round;'
  if (this.styleTrait === 'tiret') this.style += 'stroke-dasharray:10 8 10;' // Pointillés
}
Ligne.prototype = new ObjetBase()
