/**
 * Lot « pilote » : R-PASS (4 modèles) + N-SIGNES (11 modèles)
 * ==========================================================
 *
 * Classement : docs/wip/corrections-manquantes-frontiere.md (décisions du
 * 2026-09-29 : les trous × et : chez les relatifs, 0b6d749f et a5d4c3ee, passent
 * de R-INV à N-SIGNES ; les trous + et − vont à N-REL-ADD, hors de ce lot).
 *
 * R-PASS : généré depuis l'opération posée (lib/r-pass.ts).
 * N-SIGNES : rédigé ici, variation par variation, à partir de la STRUCTURE réelle
 * de chaque variation (relue en prod le 2026-09-29) ; une variation ajoutée ou
 * réordonnée depuis fait échouer l'injection (nombre de variations) ou la
 * vérification (calcul faux).
 */

import type { Lot, WrittenCorrection } from '../lib/lot';
import { colored, inline } from '../lib/palette';
import {
	CONCLUSION_SOLUTION,
	RULE_MANY_FACTORS,
	fixedSignCalculation,
	fixedSignHole,
	relation,
	rule,
	signedChain,
	signedVariable,
	type SignOperation
} from './signes';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** QCM « signe de ce produit / quotient » à deux nombres tirés (au moins un négatif) */
function twoSignedChoice(operation: SignOperation): WrittenCorrection {
	const members = operation === 'product' ? 'Les deux facteurs' : 'Le dividende et le diviseur';
	const whole = operation === 'product' ? 'Le produit' : 'Le quotient';
	return {
		steps: {
			shared: [
				rule(operation),
				`Dans ${inline(signedChain(['a', 'b'], operation))}, ` +
					`{{if:a*b>0|${members.toLowerCase()} sont négatifs : ils sont de ${relation(true)}.|` +
					`un nombre est négatif, l'autre positif : ils sont de ${relation(false)}.}}`,
				`${whole} est donc ${CONCLUSION_SOLUTION}.`
			]
		},
		notes: [
			'Les conditions du modèle garantissent au moins un nombre négatif : a·b > 0 ⇔ les deux sont négatifs.'
		]
	};
}

/** QCM « signe de ce produit » à n facteurs tirés : parité du nombre de facteurs négatifs */
function manyFactorsChoice(names: string[]): WrittenCorrection {
	const count = `{{eval:(${names.length}-${names.map((n) => `${n}/abs(${n})`).join('-')})/2}}`;
	const product = names.join('*');
	return {
		steps: {
			shared: [
				RULE_MANY_FACTORS,
				`Dans ${inline(signedChain(names, 'product'))}, on compte les facteurs négatifs : ` +
					`il y en a ${inline(colored('intermediate', count))}, un nombre ` +
					`{{if:${product}>0|${inline(colored('intermediate', '\\text{pair}'))}|` +
					`${inline(colored('intermediate', '\\text{impair}'))}}}.`,
				`Le produit est donc ${CONCLUSION_SOLUTION}.`
			]
		},
		notes: ['« il y en a 0 » est possible (tous les facteurs positifs) : 0 est pair.']
	};
}

// ============================================================================
// LOT
// ============================================================================

const RULE_NOTE = 'Règle rappelée, puis appliquée aux nombres de la variation.';

export const PILOT_LOT: Lot = {
	name: 'pilote',
	description: 'R-PASS (compléter à la dizaine) et N-SIGNES (règle des signes, × et :)',
	entries: [
		// ---------------------------------------------------------------- R-PASS
		{ templateId: '5fea90e6-9a98-433a-a909-0c4444817633', classe: 'R', code: 'R-PASS' },
		{ templateId: '83c1feb9-0c4f-4b43-ba79-2e2e0f185268', classe: 'R', code: 'R-PASS' },
		{ templateId: 'e6df0a85-507e-48a1-aadf-f46ffc7bf09a', classe: 'R', code: 'R-PASS' },
		{ templateId: '83aa2196-817e-4f49-8fee-d0053a9b9198', classe: 'R', code: 'R-PASS' },

		// -------------------------------------------------------------- N-SIGNES
		{
			// Simplifier une fraction : (−a)/b, a/(−b), (−a)/(−b)
			templateId: 'b2af6f39-9f24-4491-95ba-7d25d53813fe',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				const fraction = (numNeg: boolean, denNeg: boolean): string[] => {
					const num = numNeg ? `\\left( ${colored('transformed', '-')}{{a}} \\right)` : '{{a}}';
					const den = denNeg ? `\\left( ${colored('transformed', '-')}{{b}} \\right)` : '{{b}}';
					const negative = numNeg !== denNeg;
					const result = negative
						? `${colored('conclusion', '-')}\\dfrac{{{a}}}{{{b}}}`
						: '\\dfrac{{{a}}}{{{b}}}';
					return [
						rule('quotient'),
						`Le numérateur est ${numNeg ? 'négatif' : 'positif'} et le dénominateur est ` +
							`${denNeg ? 'négatif' : 'positif'} : ils sont de ${relation(!negative)}, donc la fraction est ` +
							`${inline(colored('conclusion', `\\text{${negative ? 'négative' : 'positive'}}`))}` +
							(negative
								? ' : on écrit le signe « − » devant la fraction.'
								: ' : on n’écrit aucun signe.'),
						`$$\\begin{align} \\dfrac{${num}}{${den}} &= ${result} \\end{align}$$`
					];
				};
				return {
					steps: {
						byVariation: [fraction(true, false), fraction(false, true), fraction(true, true)]
					},
					notes: [
						RULE_NOTE,
						'Fraction déjà irréductible (b premier avec a) : seul le signe change.'
					]
				};
			}
		},
		{
			// Calculer un produit : (−a)×b, (−a)×(−b), a×(−b)
			templateId: '2da974f7-133c-4ad3-9053-dc18a48e4afd',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				const calc = (leftNegative: boolean, rightNegative: boolean) =>
					fixedSignCalculation({
						operation: 'product',
						left: '{{a}}',
						leftNegative,
						right: '{{b}}',
						rightNegative
					});
				return {
					steps: { byVariation: [calc(true, false), calc(true, true), calc(false, true)] },
					notes: [RULE_NOTE]
				};
			}
		},
		{
			// Diviser : (−ab):b, (−ab):(−b), ab:(−b)
			templateId: '995bd551-58e8-4295-bd06-f2d377784a64',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				const calc = (leftNegative: boolean, rightNegative: boolean) =>
					fixedSignCalculation({
						operation: 'quotient',
						left: '{{eval:a*b}}',
						leftNegative,
						right: '{{b}}',
						rightNegative
					});
				return {
					steps: { byVariation: [calc(true, false), calc(true, true), calc(false, true)] },
					notes: [RULE_NOTE]
				};
			}
		},
		{
			// Compléter une multiplication à trou : le facteur manquant
			templateId: 'a5d4c3ee-4e84-4dde-ac7e-aeb557e56a45',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				// (facteur connu négatif ?, produit négatif ?) par variation
				const signs: [boolean, boolean][] = [
					[true, true], // (−a)×? = −ab
					[true, false], // (−a)×? = ab
					[false, true], // a×? = −ab
					[true, true], // ?×(−a) = −ab
					[true, false], // ?×(−a) = ab
					[false, true] // ?×a = −ab
				];
				return {
					steps: {
						byVariation: signs.map(([knownNegative, resultNegative]) =>
							fixedSignHole({
								operation: 'product',
								missing: 'factor',
								known: '{{a}}',
								knownNegative,
								result: '{{eval:a*b}}',
								resultNegative,
								distance: '{{eval:a*b}} : {{a}}'
							})
						)
					},
					notes: [
						'Classé R-INV puis N-SIGNES (décision du 2026-09-29) : signe par la règle, distance à zéro par la division.'
					]
				};
			}
		},
		{
			// Compléter une division à trou : diviseur (v0-v2) ou dividende (v3-v5) manquant
			templateId: '0b6d749f-95fc-4cfe-a83d-4e2c84bc0e38',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				const divisor = (knownNegative: boolean, resultNegative: boolean) =>
					fixedSignHole({
						operation: 'quotient',
						missing: 'divisor',
						known: '{{eval:a*b}}',
						knownNegative,
						result: '{{a}}',
						resultNegative,
						distance: '{{eval:a*b}} : {{a}}'
					});
				const dividend = (knownNegative: boolean, resultNegative: boolean) =>
					fixedSignHole({
						operation: 'quotient',
						missing: 'dividend',
						known: '{{b}}',
						knownNegative,
						result: '{{a}}',
						resultNegative,
						distance: '{{a}} \\times {{b}}'
					});
				return {
					steps: {
						byVariation: [
							divisor(true, true), // (−ab):? = −a
							divisor(true, false), // (−ab):? = a
							divisor(false, true), // ab:? = −a
							dividend(false, true), // ?:b = −a
							dividend(true, false), // ?:(−b) = a
							dividend(true, true) // ?:(−b) = −a
						]
					},
					notes: [
						'Classé R-INV puis N-SIGNES (décision du 2026-09-29) : signe par la règle, distance à zéro par l’opération inverse.'
					]
				};
			}
		},
		{
			// QCM : signe du facteur manquant (8 variations, a et b positifs)
			templateId: 'ace89247-0194-4049-b365-76c3a644069b',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				// (facteur connu négatif ?, produit négatif ?) par variation, cf. énoncés
				const signs: [boolean, boolean][] = [
					[true, false], // (−a)×? = b
					[true, true], // (−a)×? = −b
					[false, true], // a×? = −b
					[false, false], // a×? = b
					[true, false], // ?×(−a) = b
					[true, true], // ?×(−a) = −b
					[false, true], // ?×a = −b
					[false, false] // ?×a = b
				];
				return {
					steps: {
						byVariation: signs.map(([knownNegative, resultNegative]) =>
							fixedSignHole({
								operation: 'product',
								missing: 'factor',
								known: '{{a}}',
								knownNegative,
								result: '{{b}}',
								resultNegative,
								distance: '',
								choice: true
							})
						)
					},
					notes: [RULE_NOTE]
				};
			}
		},
		{
			templateId: '4bee24f9-60bc-47f3-aab9-e8904c8772bf',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => twoSignedChoice('product')
		},
		{
			templateId: '74a31e06-3cb6-4360-823b-299e7cb55e03',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => manyFactorsChoice(['a', 'b', 'c'])
		},
		{
			templateId: 'aa8d6e3b-256f-4b8e-b7eb-9493dbf7f193',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => manyFactorsChoice(['a', 'b', 'c', 'd'])
		},
		{
			templateId: '4d13f5d6-8350-4c34-96de-a5e31fb9759b',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => twoSignedChoice('quotient')
		},
		{
			// QCM : signe du nombre manquant, (a):? = (b) puis ?:(a) = (b)
			templateId: '4b07cd65-5d06-4fd4-ac56-d2388f4a66fe',
			classe: 'N',
			code: 'N-SIGNES',
			written: () => {
				const steps = (knownRole: string, missingRole: string): string[] => [
					rule('quotient'),
					`Le quotient ${inline(signedVariable('b', false))} est ` +
						`{{if:b>0|positif : le dividende et le diviseur sont de ${relation(true)}.|` +
						`négatif : le dividende et le diviseur sont de ${relation(false)}.}} ` +
						`${knownRole} ${inline(signedVariable('a', false))} est {{if:a>0|positif|négatif}}.`,
					`${missingRole} est donc ${CONCLUSION_SOLUTION}.`
				];
				return {
					steps: {
						byVariation: [
							steps('Le dividende', 'Le diviseur manquant'),
							steps('Le diviseur', 'Le dividende manquant')
						]
					},
					notes: [RULE_NOTE]
				};
			}
		}
	]
};
