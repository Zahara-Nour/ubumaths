/**
 * Atelier — `.domaine` : réponse en formule et « Comment ? » (PR 2 de
 * `.domaine`, décisions de David du 2026-10-13).
 *
 * - **Q5** : la réponse de la ligne est une formule, `D = …`, écrite
 *   EXACTEMENT comme la conclusion des étapes (même `domainToLatex`) ; la
 *   ligne « Condition » disparaît. Les refus du moteur (`DOMAIN_UNRESOLVED`)
 *   restent inchangés, sans étapes.
 * - **Q3** : une valeur interdite connue seulement en décimal
 *   (`\frac{1}{x^3-2}`) : pas d'étapes, et la réponse nomme la valeur (α) et
 *   en donne un arrondi, `α ≈ 1,26`.
 * - « Comment ? » branché derrière une garde de concordance : l'ensemble que
 *   concluent les étapes est comparé PAR VALEUR au domaine du moteur ; tout
 *   désaccord, toute exception → pas d'étapes. Niveau lycée.
 * - **Q4** : branché même quand la résolution d'une contrainte
 *   (x² − 5x + 6 ≥ 0) n'est pas rédigée. **Q6** : « domaine universel » branché.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { Domain } from '$lib/mathAST/domain/types';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { domainLine } from '../domain-steps';
import { sameDomainByValue } from '../domain-steps-check';
import { astOf } from '../parse';
import { historyToJson, historyToUbumark } from '../history-export';

// =============================================================================
// Décor
// =============================================================================

function lastEntry(input: string) {
	const desk = new CalcDesk(new Atelier());
	desk.submit(input);
	return desk.entries[desk.entries.length - 1];
}

/** L'ensemble écrit à la dernière étape : `\text{Domaine : } …`. */
function conclusionOf(steps: readonly RenderedStep[]): string {
	const last = steps[steps.length - 1].expressionLatex ?? '';
	const match = /\\text\{Domaine : \} (.*)\n\\end\{aligned\}$/.exec(last);
	if (match === null) throw new Error(`pas de conclusion : ${last}`);
	return match[1];
}

function node(text: string) {
	const parsed = astOf(text, 'text');
	if (parsed === null) throw new Error(`illisible : ${text}`);
	return parsed;
}

const num = (value: string) => ({ type: 'number', value }) as const;
const infinity = (sign: 'positive' | 'negative') => ({ type: 'infinity', sign }) as const;

/** ]lo ; hi[ (bornes ouvertes ou fermées), points exclus en plus. */
function set(
	pieces: readonly [string | null, boolean, string | null, boolean][],
	excluded: readonly string[] = []
): Domain {
	return {
		kind: 'interval_set',
		intervals: pieces.map(([lo, loClosed, hi, hiClosed]) => ({
			kind: 'interval',
			lower: {
				value: lo === null ? infinity('negative') : num(lo),
				type: loClosed ? 'closed' : 'open'
			},
			upper: {
				value: hi === null ? infinity('positive') : num(hi),
				type: hiClosed ? 'closed' : 'open'
			}
		})),
		excludedPoints: excluded.map((value) => ({ kind: 'excluded_point', value: num(value) }))
	} as Domain;
}

// =============================================================================
// Réponse en formule + « Comment ? »
// =============================================================================

describe('.domaine : la réponse est une formule, « Comment ? » quand les étapes concordent', () => {
	it.each([
		// [saisie, réponse LaTeX, réponse texte, nombre d'étapes]
		['.domaine 1/x', 'D = \\mathbb{R} \\setminus \\left\\{0\\right\\}', 'D = ℝ \\ {0}', 1],
		['.domaine \\frac1x', 'D = \\mathbb{R} \\setminus \\left\\{0\\right\\}', 'D = ℝ \\ {0}', 1],
		[
			'.domaine ln(x)/(x-2)',
			'D = ]0 ; +\\infty[ \\setminus \\left\\{2\\right\\}',
			'D = ]0 ; +∞[ \\ {2}',
			3
		],
		[
			'.domaine \\frac{\\ln x}{x-2}',
			'D = ]0 ; +\\infty[ \\setminus \\left\\{2\\right\\}',
			'D = ]0 ; +∞[ \\ {2}',
			3
		],
		// Q4 : la résolution de x² − 5x + 6 ≥ 0 n'est pas rédigée, on branche
		[
			'.domaine sqrt(x^2-5x+6)',
			'D = ]-\\infty ; 2] \\cup [3 ; +\\infty[',
			'D = ]-∞ ; 2] ∪ [3 ; +∞[',
			1
		],
		[
			'.domaine \\sqrt{x^2-5x+6}',
			'D = ]-\\infty ; 2] \\cup [3 ; +\\infty[',
			'D = ]-∞ ; 2] ∪ [3 ; +∞[',
			1
		],
		[
			'.domaine tan(x)',
			'D = \\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{2}+k\\pi,\\ k\\in\\mathbb{Z}\\right\\}',
			'D = ℝ \\ {π/2 + k·π : k ∈ ℤ}',
			1
		],
		[
			'.domaine \\tan x',
			'D = \\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{2}+k\\pi,\\ k\\in\\mathbb{Z}\\right\\}',
			'D = ℝ \\ {π/2 + k·π : k ∈ ℤ}',
			1
		],
		// Q6 : domaine universel
		['.domaine 1/(x^2+1)', 'D = \\mathbb{R}', 'D = ℝ', 1],
		['.domaine \\frac{1}{x^2+1}', 'D = \\mathbb{R}', 'D = ℝ', 1],
		// Un singleton
		['.domaine sqrt(x)sqrt(-x)', 'D = \\left\\{0\\right\\}', 'D = {0}', 3],
		['.domaine \\sqrt x\\sqrt{-x}', 'D = \\left\\{0\\right\\}', 'D = {0}', 3]
	])('%s', (input, latex, text, count) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(latex);
		expect(entry.text).toBe(text);
		// Plus de ligne « Condition », plus de texte du terminal
		expect(entry.text).not.toContain('Condition');
		expect(entry.text).not.toContain('Expression');
		expect(entry.steps).toBeDefined();
		expect(entry.steps).toHaveLength(count);
		// La réponse est écrite EXACTEMENT comme la conclusion des étapes
		expect(entry.latex).toBe(`D = ${conclusionOf(entry.steps!)}`);
		// L'interrupteur : même titres, sans les « pourquoi »
		expect(entry.summary).toBeDefined();
		expect(entry.summary!.map((s) => s.title)).toEqual(entry.steps!.map((s) => s.title));
		expect(entry.summary!.every((s) => s.explanation === undefined)).toBe(true);
	});

	it.each(['.domaine x^2+3x', '.domaine e^{x}+1'])(
		'Q6 : %s, le domaine universel se dit en une étape',
		(input) => {
			const entry = lastEntry(input);
			expect(entry.latex).toBe('D = \\mathbb{R}');
			expect(entry.steps!.map((s) => s.rule)).toEqual(['universal']);
			expect(entry.steps![0].title).toBe('Domaine universel');
		}
	);

	it('une autre variable : `.domaine ln(t) ; t`, les étapes parlent de t', () => {
		const entry = lastEntry('.domaine ln(t) ; t');
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe('D = ]0 ; +\\infty[');
		expect(entry.steps).toBeDefined();
		expect(entry.steps!.map((s) => s.expressionLatex).join(' ')).toContain('t > 0');
	});

	it('une autre variable, en LaTeX : `.domaine \\frac{1}{t-1} pour t`', () => {
		const entry = lastEntry('.domaine \\frac{1}{t-1} pour t');
		expect(entry.latex).toBe('D = \\mathbb{R} \\setminus \\left\\{1\\right\\}');
		expect(entry.steps!.map((s) => s.expressionLatex).join(' ')).toContain('t');
	});

	it('virgule décimale : réponse et étapes', () => {
		// 2,5 s'écrit 5/2 dans les ensembles (`domainToLatex`, `formatDomainInterval`)
		const entry = lastEntry('.domaine 1/(x-2.5)');
		expect(entry.text).toBe('D = ℝ \\ {5/2}');
		expect(entry.steps).toBeDefined();
		const all = [entry.latex ?? '', ...entry.steps!.map((s) => s.expressionLatex ?? '')];
		expect(all.join(' ')).not.toMatch(/\d\.\d/);
	});
});

// =============================================================================
// Export de l'historique
// =============================================================================

describe('.domaine : l’export de l’historique', () => {
	const now = new Date('2026-10-13T10:00:00Z');

	it('ubumark : la formule, plus le texte du terminal', () => {
		const md = historyToUbumark([lastEntry('.domaine 1/x')], now);
		expect(md).toContain('$D = \\mathbb{R} \\setminus \\left\\{0\\right\\}$');
		expect(md).not.toContain('Condition');
	});

	it('JSON : le texte `D = ℝ \\ {0}` et sa formule', () => {
		const json = JSON.parse(historyToJson([lastEntry('.domaine 1/x')], now));
		expect(JSON.stringify(json)).toContain('D = ℝ \\\\ {0}');
		expect(JSON.stringify(json)).not.toContain('Condition');
	});
});

// =============================================================================
// Q3 : valeur interdite connue seulement en décimal
// =============================================================================

describe('.domaine : valeur interdite connue seulement en décimal (Q3)', () => {
	it.each(['.domaine 1/(x^3-2)', '.domaine \\frac{1}{x^3-2}'])(
		'%s : pas d’étapes, la valeur est nommée et arrondie',
		(input) => {
			const entry = lastEntry(input);
			expect(entry.failed).toBe(false);
			expect(entry.steps).toBeUndefined();
			expect(entry.latex).toBe(
				'D = \\mathbb{R} \\setminus \\left\\{\\alpha\\right\\} \\text{ avec } \\alpha \\approx 1{,}26'
			);
			expect(entry.text).toBe('D = ℝ \\ {α} avec α ≈ 1,26');
			// Jamais les seize décimales du moteur
			expect(entry.text).not.toContain('1,2599');
		}
	);

	/** ℝ privé de valeurs écrites en décimal (domaine du moteur imposé). */
	function excluding(...values: string[]): Domain {
		return set([[null, false, null, false]], values);
	}

	it.each([
		// |v| < 1 : deux chiffres significatifs, jamais « α ≈ 0 »
		[['0.0464158883'], '\\alpha \\approx 0.046'],
		[['0.0004641588'], '\\alpha \\approx 0.00046'],
		[['-0.0464158883'], '\\alpha \\approx -0.046'],
		[['0.7937005259'], '\\alpha \\approx 0.79'],
		// Deux arrondis égaux : on ajoute des décimales jusqu'à les distinguer
		[['1.2599210498', '1.2612345678'], '\\alpha \\approx 1.260 \\text{ et } \\beta \\approx 1.261']
	])('arrondi de %j : %s', (values, written) => {
		const line = domainLine(node('1/x'), 'x', excluding(...values));
		expect(line?.latex).toContain(written);
	});

	it('`.domaine \\frac{1}{x^3-0.0001}` : α ≈ 0,046', () => {
		const entry = lastEntry('.domaine \\frac{1}{x^3-0.0001}');
		expect(entry.text).toBe('D = ℝ \\ {α} avec α ≈ 0,046');
	});

	it('texte et LaTeX disent le même ensemble : `\\sqrt{x}+\\frac{1}{x^3-2}`', () => {
		const entry = lastEntry('.domaine \\sqrt{x}+\\frac{1}{x^3-2}');
		expect(entry.latex).toBe(
			'D = [0 ; +\\infty[ \\setminus \\left\\{\\alpha\\right\\} \\text{ avec } \\alpha \\approx 1{,}26'
		);
		expect(entry.text).toBe('D = [0 ; +∞[ \\ {α} avec α ≈ 1,26');
	});

	it('deux valeurs approchées : α < β, dans l’ordre', () => {
		const line = domainLine(node('1/((x^3-2)(x^3+2))'), 'x');
		expect(line?.latex).toBe(
			'D = \\mathbb{R} \\setminus \\left\\{\\alpha ; \\beta\\right\\} \\text{ avec } \\alpha \\approx -1.26 \\text{ et } \\beta \\approx 1.26'
		);
		expect(line?.steps).toBeUndefined();
	});
});

// =============================================================================
// Refus du moteur : inchangés, sans étapes
// =============================================================================

describe('.domaine : refus inchangés', () => {
	it.each(['.domaine sqrt(sin(x))', '.domaine \\sqrt{\\sin x}'])('%s', (input) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(true);
		expect(entry.text).toBe('Je ne sais pas encore déterminer ce domaine.');
		expect(entry.steps).toBeUndefined();
	});
});

// =============================================================================
// La garde de concordance
// =============================================================================

describe('garde : étapes et moteur comparés par valeur', () => {
	it('le même ensemble écrit autrement : d’accord', () => {
		// ℝ \ {0} = ]−∞ ; 0[ ∪ ]0 ; +∞[
		expect(
			sameDomainByValue(
				set([[null, false, null, false]], ['0']),
				set([
					[null, false, '0', false],
					['0', false, null, false]
				])
			)
		).toBe(true);
		expect(sameDomainByValue({ kind: 'universal' }, set([[null, false, null, false]]))).toBe(true);
		expect(
			sameDomainByValue(set([['0.5', true, null, false]]), set([['0.5', true, null, false]]))
		).toBe(true);
	});

	it('une borne ouverte au lieu de fermée : désaccord', () => {
		expect(
			sameDomainByValue(set([['0', true, null, false]]), set([['0', false, null, false]]))
		).toBe(false);
	});

	it('un point exclu de trop : désaccord', () => {
		expect(
			sameDomainByValue(set([['0', false, null, false]], ['2']), set([['0', false, null, false]]))
		).toBe(false);
	});

	it('ℝ contre ℝ privé des π/2 + kπ : désaccord', () => {
		const tan: Domain = {
			kind: 'periodic_exclusion',
			basePoint: {
				type: 'division',
				numerator: { type: 'constant', constant: 'pi' },
				denominator: num('2')
			},
			period: { type: 'constant', constant: 'pi' }
		} as Domain;
		expect(sameDomainByValue(tan, { kind: 'universal' })).toBe(false);
		expect(sameDomainByValue(tan, tan)).toBe(true);
	});

	// Revue : la borne était sondée par `compile` (√2 un ulp au-dessus de ce
	// que lit `containsValue`) : [√2 et ]√2 passaient pour égaux
	it.each(['sqrt(2)', 'ln(3)', '-sqrt(2)'])(
		'[%s ; +∞[ contre la même borne ouverte : désaccord',
		(bound) => {
			const from = (closed: boolean): Domain =>
				({
					kind: 'interval_set',
					intervals: [
						{
							kind: 'interval',
							lower: { value: node(bound), type: closed ? 'closed' : 'open' },
							upper: { value: infinity('positive'), type: 'open' }
						}
					],
					excludedPoints: []
				}) as Domain;
			expect(sameDomainByValue(from(true), from(false))).toBe(false);
			expect(sameDomainByValue(from(true), from(true))).toBe(true);
		}
	);

	it('ℝ \\ {√2} contre ℝ : désaccord', () => {
		const without: Domain = {
			kind: 'interval_set',
			intervals: [
				{
					kind: 'interval',
					lower: { value: infinity('negative'), type: 'open' },
					upper: { value: infinity('positive'), type: 'open' }
				}
			],
			excludedPoints: [{ kind: 'excluded_point', value: node('sqrt(2)') }]
		} as Domain;
		expect(sameDomainByValue(without, { kind: 'universal' })).toBe(false);
	});

	it('une borne littérale (non évaluable) : pas d’accord possible', () => {
		const literal = {
			kind: 'interval_set',
			intervals: [
				{
					kind: 'interval',
					lower: { value: { type: 'variable', name: 'a' }, type: 'open' },
					upper: { value: infinity('positive'), type: 'open' }
				}
			],
			excludedPoints: []
		} as Domain;
		expect(sameDomainByValue(literal, literal)).toBe(false);
	});

	it('un domaine du moteur qui ne concorde pas : pas d’étapes, la réponse reste', () => {
		// Les étapes de 1/x concluent ℝ \ {0} ; on prétend que le moteur dit ℝ
		const line = domainLine(node('1/x'), 'x', { kind: 'universal' });
		expect(line).not.toBeNull();
		expect(line?.latex).toBe('D = \\mathbb{R}');
		expect(line?.steps).toBeUndefined();
	});

	it('le même domaine : étapes', () => {
		const line = domainLine(node('1/x'), 'x');
		expect(line?.steps).toBeDefined();
	});
});
