/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { getStr } from '../kernel/kernel'

/**
 * Définit les opérateurs de fonctions à Cinq variables réelles ou complexes.
 * @typedef Opef5v
 * @type {Object}
 */
const Opef5v = {
  somme: 0,
  produit: 1,

  indicePremiereFonctionComplexe: 64,
  nombreFonctionsComplexes5Var: 2,

  sommeC: 64,
  produitC: 65,

  nomsFoncs5Var: ['somme', 'produit'],
  nomsFonctions5Var: function (i) {
    return getStr(Opef5v.nomsFoncs5Var[i])
  },
  nomsFoncsComplexes5Var: ['somme', 'produit'],
  nomsFonctionsComplexes5Var: function (i) {
    return getStr(Opef5v.nomsFoncsComplexes5Var[i])
  },

  syntaxeNomsFoncs5Var: ['infosomme', 'infoproduit'],
  syntaxeNomsFonctions5Var: function (i) {
    return getStr(Opef5v.syntaxeNomsFoncs5Var[i])
  },
  syntaxeNomsFoncsComplexes5Var: ['infosomme', 'infoproduit'],
  syntaxeNomsFonctionsComplexes5Var: function (i) {
    return getStr(Opef5v.syntaxeNomsFoncsComplexes5Var[i])
  }
}
export default Opef5v
