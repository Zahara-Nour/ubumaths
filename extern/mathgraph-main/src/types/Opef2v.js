/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'

/**
 * Définit les opérateurs de fonctions à deux variables réelles ou complexes.
 * @typedef Opef2v
 * @type {Object}
 */
const Opef2v = {
  maxi: 0,
  mini: 1,
  gcd: 2,
  lcm: 3,
  ncr: 4,
  npr: 5,
  mod: 6,
  dotmult: 7, // Ajout version 6.7 pour multiplication terme à terme de deux matrices
  divmaxp: 8, // Ajouté version 7.0 : Renvoie le nombre maximum dont une puissance divise un nombre
  sortbyrow: 9, // Ajouté version 7.2 : Renvoie une matrice provenant de la matrice argument dont les
  // lignes sont triés selon une ligne de référence passée en deuxième argument triée par ordre croissant
  sortbycol: 10, // Ajouté version 7.2 : Renvoie une matrice provenant de la matrice argument dont les
  // lignes sont triés selon une ligne de référence passée en deuxième argument triée par ordre croissant

  // On garde de la marge pour de futures fonctions réelles
  indicePremiereFonctionComplexe: 64,
  // Début des fonctions complexes
  maxiC: 64,
  miniC: 65,
  gcdC: 66,
  lcmC: 67,
  ncrC: 68,
  nprC: 69,
  modC: 70,
  divmaxpC: 71, // Ajouté version 7.0 : Renvoie le nombre maximum dont une puissance divise un nombre

  nomsFoncs2Var: ['maxi', 'mini', 'gcd', 'lcm', 'ncr', 'npr', 'mod', 'dotmult', 'divmaxp', 'sortbyrow', 'sortbycol'],
  nomsFonctions2Var: function (i) {
    return getStr(Opef2v.nomsFoncs2Var[i])
  },

  nomsFoncsComplexes2Var: ['maxi', 'mini', 'gcd', 'lcm', 'ncr', 'npr', 'mod', 'divmaxp'],
  nomsFonctionsComplexes2Var: function (i) {
    return getStr(Opef2v.nomsFoncsComplexes2Var[i])
  },

  syntaxeNomsFoncs2Var: ['infomaxi', 'infomini', 'infogcd', 'infolcm', 'infoncr', 'infonpr', 'infomod', 'infodotmult',
    'infoDivmaxp', 'infoSortbyrow', 'infoSortbycol'],
  syntaxeNomsFonctions2Var: function (i) {
    return getStr(Opef2v.syntaxeNomsFoncs2Var[i])
  },

  syntaxeNomsFoncsComplexes2Var: ['infomaxi', 'infomini', 'infogcd', 'infolcm', 'infoncr', 'infonpr', 'infomod', 'infoDivmaxp'],
  syntaxeNomsFonctionsComplexes2Var: function (i) {
    return getStr(Opef2v.syntaxeNomsFoncsComplexes2Var[i])
  }

}

export default Opef2v
