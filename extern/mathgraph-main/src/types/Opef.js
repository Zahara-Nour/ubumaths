/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr } from '../kernel/kernel'

/**
 * Définit les opérateurs de fonctions à une variable réelle ou complexe.
 * @typedef Opef
 * @type {Object}
 */
const Opef = {
  Abso: 0,
  Raci: 1,
  Enti: 2,
  Sinu: 3,
  Cosi: 4,
  Tang: 5,
  Logn: 6,
  Expo: 7,
  ATan: 8,
  ACos: 9,
  ASin: 10,
  Cosh: 11,
  Sinh: 12,
  Tanh: 13,
  ArgCh: 14,
  ArgSh: 15,
  ArgTh: 16,
  Rand: 17,
  Raci2: 18,
  fact: 19,
  // Deux nouveaux opérateurs pour la version 4.6 : Left et Right
  Left: 20,
  Right: 21,
  Transp: 22, // Ajouté pour la version 6.7 pour transposer une matrice
  Deter: 23, // Ajouté pour la version 6.7 pour calculer le déterminant une matrice,
  Inv: 24, // Ajouté pour la version 6.7 : Inverse terme à terme d'une matrice
  Frac: 25, // Ajouté pour la version 6.7 : Renvi=oie une matrice ligne ou colonne dont le
  // premier élément est le numérateur de la fraction rationnelle approchée du nombre à 10^(-12)
  // près el le deuxième élément le dénominateur
  Nbcol: 26, // Ajouté version 7.0 pour renvoyer le nombre de colonnes d'une matrice
  Nbrow: 27, // Ajouté version 7.0 pour renvoyer le nombre de lignes d'une matrice
  Core: 28, // Ajouté version 7.9.3 pour remplacer tous les left, right, if par leur argument effectif
  indPremiereFoncComplexe: 64,

  Abs: 64,
  Sin: 65,
  Cos: 66,
  Tan: 67,
  Log: 68,
  Exp: 69,
  Ch: 70,
  Sh: 71,
  Th: 72,
  Rnd: 73,
  Conj: 74,
  Arg: 75,
  Re: 76,
  Im: 77,
  Rac: 78,
  Rac2: 79,
  EntiC: 80,
  ACosC: 81,
  ASinC: 82,
  ATanC: 83,
  ArgChC: 84,
  ArgShC: 85,
  ArgThC: 86,
  factC: 87,
  LeftC: 88,
  RightC: 89,
  CoreC: 90,
  /**
   * Renvoie true si les deux opérateurs sont équivalents.
   * Tient compte du fait qu'il y a deux opérateurs pour la racine  carrée.
   * @param {number} b1
   * @param {number} b2
   * @returns {boolean}
   */
  estEquivalent: function (b1, b2) {
    return (b1 === b2) || ((b1 === Opef.Raci) && (b2 === Opef.Raci2)) || ((b1 === Opef.Raci2) && (b2 === Opef.Raci)) ||
      ((b1 === Opef.Rac) && (b2 === Opef.Rac2)) || ((b1 === Opef.Rac2) && (b2 === Opef.Rac))
  },
  nomsFoncs: [
    'abs', 'sqrt', 'intgr', 'sin',
    'cos', 'tan', 'ln', 'exp', 'arctan',
    'arccos', 'arcsin', 'ch', 'sh',
    'th', 'argch', 'argsh', 'argth',
    'rand', 'rac', 'fact', 'left', 'right', 'transp', 'deter', 'inv', 'frac',
    'nbcol', 'nbrow', 'core'
  ],
  nomsFonctions: function (i) {
    return getStr(Opef.nomsFoncs[i])
  },

  nomsFoncsComplexes: [
    'abs', 'sin', 'cos', 'tan', 'ln',
    'exp', 'ch', 'sh', 'th', 'rand',
    'conj', 'arg', 're', 'im',
    'sqrt', 'rac', 'intgr', 'arccos',
    'arcsin', 'arctan', 'argch', 'argsh',
    'argth', 'fact', 'left', 'right', 'core'
  ],
  nomsFonctionsComplexes: function (i) {
    return getStr(Opef.nomsFoncsComplexes[i])
  },

  syntaxeNomsFoncs: [
    'infoabs', 'infosqrt', 'infointgr', 'infosin',
    'infocos', 'infotan', 'infoln', 'infoexp',
    'infoarctan', 'infoarccos', 'infoarcsin', 'infoch',
    'infosh', 'infoth', 'infoargch', 'infoargsh',
    'infoargth', 'inforand', 'inforac',
    'infofact', 'infoLeft', 'infoRight', 'infoTransp', 'infoDeter', 'infoInv', 'infofrac',
    'infoNbcol', 'infoNbrow', 'infoCore'
  ],
  syntaxeNomsFonctions: function (i) {
    return getStr(Opef.syntaxeNomsFoncs[i])
  },

  syntaxeNomsFoncsComplexes: [
    'infoabs', 'infosin', 'infocos', 'infotan',
    'infoln', 'infoexp', 'infoch', 'infosh',
    'infoth', 'inforand', 'infoconj', 'infoarg',
    'infore', 'infoim', 'infosqrt', 'inforac',
    'infointgr', 'infoarccos', 'infoarcsin',
    'infoarctan', 'infoargch', 'infoargsh',
    'infoargth', 'infofact', 'infoLeft', 'infoRight', 'infoCore'
  ],
  syntaxeNomsFonctionsComplexes: function (i) {
    return getStr(Opef.syntaxeNomsFoncsComplexes[i])
  }

}

export default Opef
