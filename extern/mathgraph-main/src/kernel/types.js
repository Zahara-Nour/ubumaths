// fichier utilisé pour définir des types génériques en jsdoc
// ça fait doublon avec src/kernel/types.d.ts (plus efficace pour l'usage local de webstorm)
// mais tsd-jsdoc en a besoin

/**
 * Une fonction de callback qui sera rappelée sans argument
 * @callback VoidCallback
 */
/**
 * Un point (dimension 2) avec propriétés x et y
 * @typedef Point
 * @property {number} x
 * @property {number} y
 */
/**
 * Un bouton pouvant avoir un tip (pour pouvoir le passer à app.setTip())
 * @interface TippedElt
 * @property {number} y
 * @property {string} tip
 * @property {'left'|'top'|'right'|'float'} target
 * @property {HTMLElement} container
 * @property {boolean} tipDisplayed
 */
