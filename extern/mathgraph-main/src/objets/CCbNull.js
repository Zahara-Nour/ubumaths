/**
 * @constructor
 * @extends CCb
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from './CCb'

export default CCbNull

/**
 * @constructor
 * @extends CCb
 * Objet servant dans les éditeurs de formules en ligne.
 * Lorsqu'une erreur de syntaxe est trouvée, on utilise cet objet pour compléter
 * quand même l'arbre binaire de calcul.
 * @param {string} chaine  La chaîne rprésentant le calcul.
 * @returns {CCbNull}
 */
function CCbNull (chaine) {
  CCb.call(this)
  this.chaine = chaine
}
CCbNull.prototype = new CCb()
CCbNull.prototype.constructor = CCbNull
CCbNull.prototype.superClass = 'CCb'
CCbNull.prototype.className = 'CCbNull'

CCbNull.prototype.getClone = function () {
  return null
}

CCbNull.prototype.chaineCalcul = function () {
  return this.chaine
}

CCbNull.prototype.chaineLatex = function () {
  return this.chaine
}
