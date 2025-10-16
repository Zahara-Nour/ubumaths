/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'

/**
 * Définit les opérateurs de fonctions à quatre variables réelles ou complexes.
 * La seule fonction à 4 variables est l'intégrale.
 * @typedef Opef4v
 * @type {Object}
 */
const Opef4v = {
  integrale: 0,
  primitive: 1,

  indicePremiereFonctionComplexe: 64,
  integraleC: 64,
  primitiveC: 65,

  nomsFoncs4Var: ['integrale', 'primitive'],
  nomsFonctions4Var: function (i) {
    return getStr(Opef4v.nomsFoncs4Var[i])
  },
  nomsFoncsComplexes4Var: ['integrale', 'primitive'],
  nomsFonctionsComplexes4Var: function (i) {
    return getStr(Opef4v.nomsFoncsComplexes4Var[i])
  },
  syntaxeNomsFoncs4Var: ['infointegrale', 'infoprimitive'],
  syntaxeNomsFonctions4Var: function (i) {
    return getStr(Opef4v.syntaxeNomsFoncs4Var[i])
  },
  syntaxeNomsFoncsComplexes4Var: ['infointegrale', 'infoprimitive'],
  syntaxeNomsFonctionsComplexes4Var: function (i) {
    return getStr(Opef4v.syntaxeNomsFoncsComplexes4Var[i])
  }
}

export default Opef4v
