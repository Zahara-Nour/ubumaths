/**
 * Lot « n-decomp » : décomposition / recomposition selon les rangs (13 modèles)
 * ============================================================================
 *
 * Classement : docs/archive/wip/corrections-manquantes-frontiere.md, tous les modèles
 * `N-DECOMP` (entiers et décimaux). Idée : le tableau de numération, le chiffre
 * et sa valeur en orange, les zéros en bleu.
 *
 * Tirages réels relus (prod, lecture seule, 2026-09-29). accbfd16 et 7c642d2f
 * nomment `e` le chiffre des unités : aucune condition ne peut porter sur lui
 * (constante d'Euler), il est écrit sans condition, `(e × 1)`.
 */

import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import {
	decimalDecomposition,
	integerDecomposition,
	integerRecomposition,
	type PlaceDigit
} from './numeration';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Chiffres d'un entier, du plus grand rang aux unités ; `zeros` = fixés à 0 */
function digits(names: string[], zeros: string[] = []): PlaceDigit[] {
	return names.map((name, index) => ({
		variable: zeros.includes(name) ? null : name,
		power: 10 ** (names.length - 1 - index)
	}));
}

function shared(steps: string[], notes: string[] = []): () => WrittenCorrection {
	return () => ({ steps: { shared: steps }, notes });
}

const entry = (templateId: string, written: () => WrittenCorrection): LotEntry => ({
	templateId,
	classe: 'N',
	code: 'N-DECOMP',
	written
});

const RECOMPOSE = (names: string[]) => digits(names) as { variable: string; power: number }[];
const E_NOTE =
	'⚑ Modèle : le chiffre des unités s’appelle `e` (constante d’Euler dans une condition) : écrit sans condition, (e × 1).';

// ============================================================================
// LOT
// ============================================================================

export const N_DECOMP_LOT: Lot = {
	name: 'n-decomp',
	description: 'N-DECOMP (décomposition et recomposition selon les rangs)',
	entries: [
		// Décimaux
		entry(
			'2227cd4e-cde2-4dbd-9930-5116d110c626',
			shared(
				decimalDecomposition(
					'a',
					[
						{ variable: 'b', power: 10 },
						{ variable: 'c', power: 100 }
					],
					'decimals'
				)
			)
		),
		entry(
			'ef7785cf-e448-4ee7-b588-a4e298bcc696',
			shared(
				decimalDecomposition(
					'a',
					[
						{ variable: 'b', power: 10 },
						{ variable: 'c', power: 100 },
						{ variable: 'd', power: 1000 }
					],
					'decimals'
				)
			)
		),
		// Entiers : décomposer
		entry(
			'52c4d773-d86c-45a3-88e4-ddc99cc4beab',
			shared(integerDecomposition(digits(['a', 'b']), 'values'))
		),
		entry('9827242b-fbcd-4b63-8003-2b898372be63', () => ({
			steps: {
				byVariation: [[], ['b'], ['c']].map((zeros) =>
					integerDecomposition(digits(['a', 'b', 'c'], zeros), 'values')
				)
			},
			notes: ['Variations 1 et 2 : chiffre des dizaines / des unités fixé à 0, sans terme.']
		})),
		entry(
			'495a397f-23b6-4bc4-82c3-2974b234b275',
			shared(integerDecomposition(digits(['a', 'b', 'c']), 'products'))
		),
		entry(
			'7a34967c-bcb2-414b-920f-05d04aba34b4',
			shared(integerDecomposition(digits(['a', 'b', 'c', 'd']), 'values'))
		),
		entry(
			'823f9e95-4459-49fb-9378-683e1b886079',
			shared(integerDecomposition(digits(['a', 'b', 'c', 'd']), 'products'))
		),
		entry(
			'a6045667-0ede-4774-a56b-d4728841133c',
			shared(integerDecomposition(digits(['a', 'b', 'c', 'd', 'n']), 'values'))
		),
		entry(
			'7612e79a-7d54-4020-8d11-7253ec42622a',
			shared(integerDecomposition(digits(['a', 'b', 'c', 'd', 'n']), 'products'))
		),
		// Entiers : recomposer
		entry(
			'accbfd16-cfcb-4256-a4db-c2f9383b5feb',
			shared(
				integerRecomposition({
					digits: RECOMPOSE(['a', 'b', 'c', 'd', 'e']),
					shuffled: false,
					unitsBranchable: false
				}),
				[E_NOTE]
			)
		),
		entry(
			'7c642d2f-7060-45bf-bce7-9192925ff49c',
			shared(
				integerRecomposition({
					digits: RECOMPOSE(['a', 'b', 'c', 'd', 'e']),
					shuffled: true,
					unitsBranchable: false
				}),
				[E_NOTE, 'Termes mélangés dans l’énoncé : la correction les range.']
			)
		),
		entry(
			'3eedd905-1526-4c90-9005-eb1df389a9f9',
			shared(
				integerRecomposition({
					digits: RECOMPOSE(['a', 'b', 'c']),
					shuffled: false,
					unitsBranchable: true
				})
			)
		),
		entry(
			'6ef8aedf-c8cf-4769-aa3e-b3de249492ae',
			shared(
				integerRecomposition({
					digits: RECOMPOSE(['a', 'b', 'c', 'd']),
					shuffled: false,
					unitsBranchable: true
				})
			)
		)
	]
};
