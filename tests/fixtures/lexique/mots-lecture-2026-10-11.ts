/**
 * Mots de la lecture d'une expression : copie figée des 4 entrées ajoutées au
 * dictionnaire le 2026-10-11 (validées par David), par la migration
 * 20261016090300_dictionnaire_mots_lecture. Ce sont les clés que
 * `src/lib/mathAST/structure/reading.ts` passe à `LexiconTerm` et qui manquaient
 * au jeu de référence (figé, non modifié : voir docs/systeme/dictionnaire.md,
 * « Comment étendre »).
 *
 * Une base locale fraîche (`db:reset`) contient, dans cet ordre :
 * REFERENCE_DICTIONARY puis ces 4 entrées.
 */

import type { MathTerm } from '$lib/dictionary/model';

export const READING_WORDS_2026_10_11: MathTerm[] = [
	{
		term: 'différent',
		tags: ['transversal'],
		definitions: {
			items: [
				{
					grade: 'CE1',
					content:
						"Se dit de deux quantités qui n'ont pas la même valeur. Symbole : $\\neq$. Ex : $3 + 4 \\neq 8$."
				}
			]
		},
		grade: 'CE1',
		// Mot courant de la langue (« des valeurs différentes ») : jamais souligné, comme « égal »
		autoLink: false
	},
	{
		term: 'racine cubique',
		tags: ['racines-carrees'],
		definitions: {
			items: [
				{
					grade: '2',
					content:
						'$\\sqrt[3]{a}$ est le nombre dont le cube vaut $a$. Ex : $\\sqrt[3]{8} = 2$ car $2^3 = 8$.'
				}
			]
		},
		grade: '2'
	},
	{
		term: 'racine n-ième',
		tags: ['racines-carrees'],
		definitions: {
			items: [
				{
					grade: 'T_EXP',
					content:
						'Pour $a \\geq 0$ et $n$ entier non nul, $\\sqrt[n]{a}$ est le nombre positif dont la puissance $n$ vaut $a$. Ex : $\\sqrt[4]{81} = 3$ car $3^4 = 81$.'
				}
			]
		},
		grade: 'T_EXP'
	},
	{
		term: 'logarithme décimal',
		tags: ['fonctions'],
		definitions: {
			items: [
				{
					grade: 'T_TECHNO',
					content:
						'Pour $b > 0$, $\\log(b)$ est le nombre $x$ tel que $10^x = b$. Ex : $\\log(1000) = 3$.'
				}
			]
		},
		grade: 'T_TECHNO'
	}
];
