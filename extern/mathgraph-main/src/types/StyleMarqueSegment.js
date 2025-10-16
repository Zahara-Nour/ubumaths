/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Sert à définir les difféents types de marques de segments.
 * @typedef StyleMarqueSegment
 * @type {Object}
 */
const StyleMarqueSegment = {
  marqueSimple: 0,
  marqueDouble: 1,
  marqueTriple: 2,
  marqueCroix: 3
}
// on pourrait tout faire en une ligne avec `export default {props}` mais on remet le nom ici
// (pour la recherche dans le code)
export default StyleMarqueSegment
