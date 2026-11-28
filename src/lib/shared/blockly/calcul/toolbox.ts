/**
 * Boîtes à outils des programmes de calcul, par niveau (5e, 4e, 3e) : uniquement des blocs que
 * `executerCalcul` sait exécuter au niveau (ADR 0039 ; `NIVEAU_DES_BLOCS` de l'interpréteur).
 * Chaque entrée porte une ombre, pour que l'élève voie un nombre à changer ou une place où poser
 * « nombre choisi ».
 *
 * - 5e : nombre choisi, + − × ÷, nombre, la variable `résultat`, afficher, `controls_repeat`
 *   (nombre de tours écrit dans le bloc).
 * - 4e : sans `résultat` ; variables créées par l'élève (catégorie dynamique de Blockly,
 *   « Créer une variable… »), reste de la division, « si … alors (sinon) », comparaisons,
 *   `controls_repeat_ext` (nombre de tours calculé).
 * - 3e : et / ou, non, « répéter jusqu'à » en plus.
 *
 * Sans import de Blockly : se charge partout (les couleurs servent aussi à `blocs.ts`).
 */

import type { NiveauCalcul } from './interpreteur';

/** Couleurs des catégories (même saturation que les autres catégories). */
export const COULEURS_CALCUL = {
	calcul: '#3D4570',
	resultat: '#703D55',
	afficher: '#3D705E',
	boucles: '#3D703D',
	// Celles des blocs génériques du thème Classic (comparaisons, variables), pour que catégorie
	// et blocs se ressemblent
	conditions: '#5B80A5',
	variables: '#A55B80'
} as const;

/** Catégorie dynamique des variables de Blockly (bouton « Créer une variable… » et ses blocs). */
export const CATEGORIE_VARIABLES = 'VARIABLE';

function nombre(valeur: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeur } } } as const;
}

/** Bloc d'opération de la boîte à outils (+ − × ÷), à deux nombres en ombre. */
export function operation(op: 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE', b: number) {
	return {
		kind: 'block',
		type: 'calcul_operation',
		fields: { OP: op },
		inputs: { A: nombre(1), B: nombre(b) }
	} as const;
}

function comparaison(op: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE') {
	return {
		kind: 'block',
		type: 'logic_compare',
		fields: { OP: op },
		inputs: { A: nombre(0), B: nombre(10) }
	} as const;
}

const CALCUL_5E = {
	kind: 'category',
	name: 'Calcul',
	colour: COULEURS_CALCUL.calcul,
	contents: [
		{ kind: 'block', type: 'calcul_nombre_choisi' },
		operation('ADD', 2),
		operation('MINUS', 2),
		operation('MULTIPLY', 2),
		operation('DIVIDE', 2),
		{ kind: 'block', type: 'math_number', fields: { NUM: 1 } }
	]
} as const;

const RESULTAT = {
	kind: 'category',
	name: 'Résultat',
	colour: COULEURS_CALCUL.resultat,
	contents: [
		{ kind: 'block', type: 'calcul_mettre_resultat', inputs: { VALEUR: nombre(0) } },
		{ kind: 'block', type: 'calcul_resultat' }
	]
} as const;

const AFFICHER = {
	kind: 'category',
	name: 'Afficher',
	colour: COULEURS_CALCUL.afficher,
	contents: [{ kind: 'block', type: 'calcul_afficher', inputs: { VALEUR: nombre(0) } }]
} as const;

/** Boîte à outils de 5e (la seule avant la piste 4e / 3e). */
export const CALCUL_TOOLBOX = {
	kind: 'categoryToolbox',
	contents: [
		CALCUL_5E,
		RESULTAT,
		AFFICHER,
		{
			kind: 'category',
			name: 'Boucles',
			colour: COULEURS_CALCUL.boucles,
			contents: [{ kind: 'block', type: 'controls_repeat', fields: { TIMES: 2 } }]
		}
	]
} as const;

/** Catégorie des variables créées par l'élève (4e, 3e ; la tortue de 4e / 3e aussi). */
export const CATEGORIE_DES_VARIABLES = {
	kind: 'category',
	name: 'Variables',
	colour: COULEURS_CALCUL.variables,
	custom: CATEGORIE_VARIABLES
} as const;

/**
 * Catégorie « Conditions » : « si … alors (sinon) », comparaisons ; et / ou, non avec
 * `logique` (3e). La tortue de 3e la reprend.
 */
export function categorieConditions(logique: boolean) {
	return {
		kind: 'category',
		name: 'Conditions',
		colour: COULEURS_CALCUL.conditions,
		contents: [
			{ kind: 'block', type: 'calcul_si' },
			{ kind: 'block', type: 'calcul_si_sinon' },
			comparaison('EQ'),
			comparaison('NEQ'),
			comparaison('LT'),
			comparaison('LTE'),
			comparaison('GT'),
			comparaison('GTE'),
			...(logique
				? [
						{ kind: 'block', type: 'logic_operation', fields: { OP: 'AND' } },
						{ kind: 'block', type: 'logic_operation', fields: { OP: 'OR' } },
						{ kind: 'block', type: 'logic_negate' }
					]
				: [])
		]
	};
}

/** Boîte à outils des blocs proposés au niveau donné. */
export function toolboxCalcul(niveau: NiveauCalcul) {
	if (niveau === '5e') return CALCUL_TOOLBOX;
	const troisieme = niveau === '3e';
	return {
		kind: 'categoryToolbox',
		contents: [
			{
				...CALCUL_5E,
				contents: [
					...CALCUL_5E.contents,
					{
						kind: 'block',
						type: 'math_modulo',
						inputs: { DIVIDEND: nombre(7), DIVISOR: nombre(2) }
					}
				]
			},
			CATEGORIE_DES_VARIABLES,
			AFFICHER,
			categorieConditions(troisieme),
			{
				kind: 'category',
				name: 'Boucles',
				colour: COULEURS_CALCUL.boucles,
				contents: [
					{ kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: nombre(2) } },
					...(troisieme ? [{ kind: 'block', type: 'calcul_repeter_jusqua' }] : [])
				]
			}
		]
	};
}
