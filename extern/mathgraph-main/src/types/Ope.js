/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Classe définissant les natures des opérations utilisés par le logiciel.
 * @typedef Ope
 * @type {Object}
 */
const Ope = {
  Plus: 0,
  Moin: 1,
  Mult: 2,
  Divi: 3,
  Inf: 4,
  Sup: 5,
  InfOuEgal: 6,
  SupOuEgal: 7,
  Egalite: 8,
  Diff: 9,
  And: 10,
  Or: 11,
  /**
   * Renvoie true si l'opérateur est un opérateur de test
   * @param {number} val
   * @returns {boolean}
   */
  estTest: function (val) {
    return (val === Ope.Inf) || (val === Ope.Sup) || (val === Ope.InfOuEgal) ||
        (val === Ope.SupOuEgal) || (val === Ope.Egalite) || (val === Ope.Diff) ||
        (val === Ope.And) || (val === Ope.Or)
  },
  /**
   * Renvoie la chaîne de caractères représentant l'opérateur.
   * @param {number} val
   * @returns {string}
   */
  chaineOperateur: function (val) {
    switch (val) {
      case Ope.Plus : return '+'
      case Ope.Moin : return '-'
      case Ope.Mult : return '*'
      case Ope.Divi : return '/'
      case Ope.Inf : return '<'
      case Ope.Sup : return '>'
      case Ope.InfOuEgal : return '<='
      case Ope.SupOuEgal : return '>='
      case Ope.Egalite : return '='
      case Ope.Diff : return '<>'
      case Ope.And : return '&'
      case Ope.Or : return '|'
      default : return ''
    }
  },
  /**
   * Renvoie la chaîne de caractères représentant l'opérateur en LaTeX.
   * @param {number} val
   * @returns {string}
   */
  chaineOperateurLatex: function (val) {
    switch (val) {
      case Ope.InfOuEgal : return '\\le '
      case Ope.SupOuEgal : return '\\ge '
      case Ope.Diff : return '\\ne '
      case Ope.And : return '\\,\\&'
      case Ope.Or : return '\\,|'

      default : return Ope.chaineOperateur(val)
    }
  }
}

export default Ope
