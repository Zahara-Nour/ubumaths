/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'

/**
 * Définit les opérateurs de fonctions à trois variables réelles ou complexes.
 * La seule fonction à 3 variables est le test si.
 * @typedef Opef3v
 * @type {Object}
 */

const Opef3v = {
  si: 0,

  indicePremiereFonctionComplexe: 64,
  nombreFonctionsComplexes3Var: 1,
  siC: 64,
  nomsFoncs3Var: ['si'],
  nomsFonctions3Var: function (i) {
    return getStr(Opef3v.nomsFoncs3Var[i])
  },

  nomsFoncsComplexes3Var: ['si'],
  nomsFonctionsComplexes3Var: function (i) {
    return getStr(Opef3v.nomsFoncsComplexes3Var[i])
  },
  syntaxeNomsFoncs3Var: ['infosi'],
  syntaxeNomsFonctions3Var: function (i) {
    return getStr(Opef3v.syntaxeNomsFoncs3Var[i])
  },

  syntaxeNomsFoncsComplexes3Var: ['infosi'],
  syntaxeNomsFonctionsComplexes3Var: function (i) {
    return getStr(Opef3v.syntaxeNomsFoncsComplexes3Var[i])
  }

}
export default Opef3v
