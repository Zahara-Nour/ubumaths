/**
 * Lot « n-fracdec » : fraction décimale ↔ écriture décimale (20 modèles)
 * ======================================================================
 *
 * Classement : docs/archive/wip/corrections-manquantes-frontiere.md, tous les modèles
 * `N-FRACDEC`. Règle : le dénominateur 10 / 100 / 1000 donne le rang du dernier
 * chiffre du numérateur ; simplifier si demandé.
 *
 * Tirages réels relus (prod, lecture seule, 2026-09-29) : deux modèles tirent
 * AUSSI des fractions non décimales (322f3479, dd7db98e : 7/2, 1/4, 1/5…) → une
 * branche par fraction de la liste, amplifiée jusqu'à 10 / 100 / 1000
 * (`7/2 = 35/10 = 3.5`). Rédigé modèle par modèle, variation par variation (un
 * chiffre fixé à 0 par la variation change la rédaction).
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import { mergedVariables } from '../lib/operation';
import {
	decimalDecomposition,
	decimalToFraction,
	fractionSumToDecimal,
	fractionToDecimal,
	listedFraction,
	unitsPlusFraction,
	type DecimalPart
} from './numeration';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Rangs décimaux b/10, c/100 (, d/1000) ; `zeros` = variables fixées à 0 */
function parts(names: string[], zeros: string[] = []): DecimalPart[] {
	return names.map((name, index) => ({
		variable: zeros.includes(name) ? null : name,
		power: 10 ** (index + 1)
	}));
}

function perVariation(
	build: (zeros: string[]) => string[],
	zeros: string[][],
	notes: string[]
): WrittenCorrection {
	return { steps: { byVariation: zeros.map(build) }, notes };
}

/** Fraction tirée dans une liste `a` (peut mêler fractions décimales et non décimales) */
function listed(template: QuestionTemplate): WrittenCorrection {
	const variable = mergedVariables(template, 0).find((v) => v.name === 'a');
	if (!variable) throw new Error('variable « a » absente');
	const { steps, mixed, collisions } = listedFraction('a', variable.expression);
	return {
		steps: { shared: steps },
		notes: [
			`Liste tirée : ${variable.expression} — une branche par fraction.`,
			...(mixed
				? ['CAS MÊLÉS : fractions non décimales amplifiées jusqu’à 10 / 100 / 1000 (7/2 = 35/10).']
				: []),
			...collisions.map(
				(c) =>
					`⚑ Modèle : ${c} ont la même valeur, aucune condition ne les distingue : branche commune, fraction tirée écrite telle quelle.`
			)
		]
	};
}

const SUM3 = ['b', 'c'];
const SUM4 = ['b', 'c', 'd'];
const ZEROS3 = [[], ['b'], ['c']];
const ZEROS4 = [[], ['b'], ['c'], ['b', 'c']];
const ZERO_NOTE = 'Variation à chiffre fixé à 0 : terme nul omis, 0 écrit en bleu dans le tableau.';
const TEMPLATE_ZERO_NOTE =
	'⚑ Modèle : dans les variations à 0, la réponse attendue écrit le terme nul (5 + 0/10 + 4/100) ; la correction ne l’écrit pas.';

const entry = (
	templateId: string,
	written: (template: QuestionTemplate) => WrittenCorrection
): LotEntry => ({ templateId, classe: 'N', code: 'N-FRACDEC', written });

// ============================================================================
// LOT
// ============================================================================

export const N_FRACDEC_LOT: Lot = {
	name: 'n-fracdec',
	description: 'N-FRACDEC (fraction décimale ↔ écriture décimale)',
	entries: [
		// Décomposer un décimal en fractions décimales
		entry('160f782d-c2ee-4d54-a8f9-86f52418abe9', () =>
			perVariation((z) => decimalDecomposition('a', parts(SUM3, z), 'fractions'), ZEROS3, [
				ZERO_NOTE,
				TEMPLATE_ZERO_NOTE
			])
		),
		entry('58f7a8dd-b8de-48f4-9cfa-5356b75e1c64', () =>
			perVariation((z) => decimalDecomposition('a', parts(SUM4, z), 'fractions'), ZEROS3, [
				ZERO_NOTE,
				TEMPLATE_ZERO_NOTE
			])
		),
		// Somme de fractions décimales → nombre décimal
		entry('8e32995e-a0fa-4a98-a975-379cc7274f50', () =>
			perVariation((z) => fractionSumToDecimal('a', parts(SUM3, z), false), ZEROS3, [ZERO_NOTE])
		),
		entry('9c602223-064b-4efb-8649-8bf104e1d8b2', () =>
			perVariation((z) => fractionSumToDecimal('a', parts(SUM3, z), true), ZEROS3, [
				ZERO_NOTE,
				'Termes mélangés dans l’énoncé : la correction les range.'
			])
		),
		entry('a377acaf-8e96-4ff4-93b6-23e841b0b094', () =>
			perVariation((z) => fractionSumToDecimal('a', parts(SUM4, z), false), ZEROS4, [ZERO_NOTE])
		),
		entry('fcc54919-0d4d-4794-b27f-1a7945d19fd3', () =>
			perVariation((z) => fractionSumToDecimal('a', parts(SUM4, z), true), ZEROS4, [
				ZERO_NOTE,
				'Termes mélangés dans l’énoncé : la correction les range.'
			])
		),
		// Unités + une fraction décimale (numérateur à 1, 2 ou 3 chiffres)
		entry('c680af72-1509-440b-b6a9-bbac0828d0e1', () => ({
			steps: { shared: unitsPlusFraction('a', 'c', 100) },
			notes: ['c à 1 ou 2 chiffres : zéro ajouté (5 + 2/100 = 5.02) ou supprimé (70/100 = 0.7).']
		})),
		entry('757fc872-e037-47b6-b344-21d48a81e952', () => ({
			steps: { shared: unitsPlusFraction('a', 'c', 1000) },
			notes: [
				'c à 1, 2 ou 3 chiffres : zéros ajoutés (5 + 2/1000 = 5.002) ou supprimés (460/1000).'
			]
		})),
		// Décimal → fraction (simplifiée)
		entry('000368e1-cc26-4b75-a3f3-cc619c02f940', () => ({
			steps: { shared: decimalToFraction() },
			notes: ['La réponse attendue est irréductible (b/a) : la correction simplifie.']
		})),
		entry('c1a83c8f-47ea-4253-92cd-3cc703f913c2', () => ({
			steps: { shared: decimalToFraction() },
			notes: ['Dixièmes si 10b/a est entier, sinon centièmes ; simplification par le PGCD.']
		})),
		entry('81a64b0a-e6a2-45fc-90ce-c0aee11f539c', () => ({
			steps: { shared: decimalToFraction() },
			notes: ['Condition du modèle gcd(a,b) = 1 : b/a déjà irréductible.']
		})),
		// Fraction d'une liste (cas mêlés)
		entry('322f3479-0120-4a6d-839a-4e8df194f99e', listed),
		entry('dd7db98e-2c46-4b1f-9501-edfa5b161ac1', listed),
		// Fraction décimale → écriture décimale
		entry('d159d49f-4141-4ac4-9cb1-de40cba2ffc1', () => ({
			steps: { shared: fractionToDecimal('a', 10) },
			notes: []
		})),
		entry('37e39a3e-2714-4ca4-917a-7c865067aa86', () => ({
			steps: { shared: fractionToDecimal('a', 100) },
			notes: []
		})),
		entry('c88d66d6-099c-407f-8b41-2508888e4bd7', () => ({
			steps: { shared: fractionToDecimal('a', 100) },
			notes: []
		})),
		entry('8a3a572b-526d-4d3a-a854-bb8b9e364190', () => ({
			steps: { shared: fractionToDecimal('b', { variable: 'c', values: [10, 100] }) },
			notes: ['Numérateur à 2–4 chiffres : zéro final supprimé (4240/10 = 424.0 = 424).']
		})),
		entry('f3477519-1309-4deb-b3cc-5af828f900bb', () => ({
			steps: { shared: fractionToDecimal('a', 1000) },
			notes: []
		})),
		entry('b1d3c8aa-34f3-4d01-9e27-499a91c1940e', () => ({
			steps: { shared: fractionToDecimal('a', 1000) },
			notes: []
		})),
		entry('a62ccb82-e528-4618-867d-728eda80dd8e', () => ({
			steps: { shared: fractionToDecimal('b', { variable: 'c', values: [10, 100, 1000] }) },
			notes: ['Numérateur à 2–4 chiffres : zéros ajoutés (84/1000 = 0.084) ou supprimés (4240/10).']
		}))
	]
};
