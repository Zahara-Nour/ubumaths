/*!
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// cf https://mathjs.org/docs/custom_bundling.html
// Attention, il faudra alors aussi faire passer les js de mathjs par babel
// (notre config exclue tous les node_modules par défaut)
import { create, addDependencies, detDependencies, invDependencies, matrixDependencies, multiplyDependencies } from 'mathjs'

const { add, det, inv, matrix, multiply } = create({
  addDependencies,
  detDependencies,
  invDependencies,
  matrixDependencies,
  multiplyDependencies
}, {})

// un export par défaut qui les exporte tous
export default { add, det, inv, matrix, multiply }

// pour éviter de récupérer tous les contenus de mathjs/types/index.d.ts dans notre types.d.ts
// (et ceux decimal.js qu'il importe)
// on définit ici un résumé du typeMathJsChain (cf commit e999dadb pour ajouter l'import des types
// de mathjs dans notre types.d.ts, mais ça fonctionne plus si on copie ce fichier de types ailleurs
// sans importer mathgraph et ses dépendances, on laisse tomber).

/**
 * Objet mathjs retourné par ses fonctions, on ne décrit ici que les méthodes qu'on utilise, il y en a plein d'autres
 * @typedef MathJsChain
 * @property {mathJsGet} get
 * @property {mathJsSize} size
 */
/**
 * @callback mathJsGet
 * @param {number|number[]} index
 * @returns {*}
 */
/**
 * @callback mathJsSize
 * @returns {number[]}
 */
