/**
 * Oracle numérique du domaine de définition (test PERMANENT, CI).
 *
 * `.domaine` rendait des domaines FAUX sans le dire : `1/(x-1/2)` → ℝ,
 * `sqrt(x-1/3)` → ℝ (une division par une constante rendait la contrainte
 * « complexe », ignorée en silence), `sqrt(3x-1)` → `[0.3333333333333333 ; +∞[`.
 * Ici, chaque fonction du corpus est saisie en LaTeX comme un élève ; le
 * domaine rendu est confronté à l'attendu écrit à la main, à un arbitre
 * numérique (f évaluée par `compile`) et à l'exactitude des bornes.
 *
 * Conventions décidées :
 * - x^a, a non entier : x ≥ 0 si a > 0, x > 0 si a < 0 (x^a = e^{a ln x},
 *   comme l'évaluateur) ; la racine cubique de tout réel s'écrit `\sqrt[3]{x}` ;
 * - tan, 1/sin, 1/cos d'un argument affine : `ℝ \ {a + k·T : k ∈ ℤ}`, a et T
 *   exacts (π/4, π/2) ; une exclusion périodique combinée à d'autres
 *   contraintes (√sin x, tan x + 1/x) n'a pas de rendu → refus ;
 * - un paramètre (ln(t) en x) est supposé admis ; une contrainte qui mêle x
 *   et un paramètre (1/(x−a)) → refus.
 * « Refus » n'est pas un échec : il est compté, et figé.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '$lib/atelier/calcul';
import { DOMAIN_CORPUS, type DomainEntry } from './corpus';
import { judgeEntry, numericMismatches, parseExpected, type DomainVerdict } from './harness';
import { KNOWN_REFUSED, KNOWN_WRONG } from './known';

/** Variantes générées : coefficients rationnels a/b (la classe du bug). */
const RATIONALS: readonly (readonly [number, number])[] = [
	[1, 2],
	[1, 3],
	[2, 3],
	[3, 4],
	[5, 2],
	[7, 3],
	[4, 5],
	[1, 6]
];

function frac(p: number, q: number): string {
	return `\\frac{${p}}{${q}}`;
}

const GENERATED: readonly DomainEntry[] = RATIONALS.flatMap(([p, q]) => [
	{ id: `gen-pole-${p}-${q}`, f: `\\frac{1}{${q}x-${p}}`, expected: `R \\ {${frac(p, q)}}` },
	{ id: `gen-sqrt-${p}-${q}`, f: `\\sqrt{x-${frac(p, q)}}`, expected: `[${frac(p, q)} ; +oo[` },
	{ id: `gen-ln-${p}-${q}`, f: `\\ln(${p}-${q}x)`, expected: `]-oo ; ${frac(p, q)}[` }
]);

const ALL: readonly DomainEntry[] = [
	...DOMAIN_CORPUS.flatMap((family) => family.entries),
	...GENERATED
];

/** Coverage plancher : part des entrées avec un domaine juste. */
const COVERAGE_FLOOR = 0.85;

let cached: readonly DomainVerdict[] | null = null;
function verdicts(): readonly DomainVerdict[] {
	cached ??= ALL.map(judgeEntry);
	return cached;
}

describe('oracle du domaine — corpus', () => {
	it('les identifiants sont uniques et le corpus fait ~200 entrées', () => {
		const ids = ALL.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ALL.length).toBeGreaterThanOrEqual(200);
	});

	it('l’arbitre numérique valide chaque attendu écrit à la main', () => {
		const bad = ALL.filter((e) => e.expected !== 'REFUS').flatMap((entry) => {
			const mism = numericMismatches(entry, parseExpected(entry.expected));
			return mism.length > 0 ? [`${entry.id} (${entry.f}) : x = ${mism[0]}`] : [];
		});
		expect(bad).toEqual([]);
	});
});

describe('oracle du domaine — moteur', () => {
	it('aucun domaine faux hors KNOWN_WRONG ; KNOWN_WRONG à jour', () => {
		const wrong = Object.fromEntries(
			verdicts()
				.filter((v) => v.wrong.length > 0)
				.map((v) => [v.entry.id, `${v.rendered} — ${v.wrong.join(' ; ')}`])
		);
		expect(Object.keys(wrong).sort()).toEqual(Object.keys(KNOWN_WRONG).sort());
	});

	it('refus figés (KNOWN_REFUSED)', () => {
		const refused = verdicts()
			.filter((v) => v.refused)
			.map((v) => v.entry.id)
			.sort();
		expect(refused).toEqual(Object.keys(KNOWN_REFUSED).sort());
	});

	it('une entrée attendue « REFUS » ne reçoit jamais de domaine', () => {
		const answered = verdicts()
			.filter((v) => v.entry.expected === 'REFUS' && !v.refused)
			.map((v) => `${v.entry.id} → ${v.rendered}`);
		expect(answered).toEqual([]);
	});

	it(`couverture ≥ ${COVERAGE_FLOOR * 100} %`, () => {
		const ok = verdicts().filter((v) => !v.refused && v.wrong.length === 0).length;
		expect(ok / ALL.length).toBeGreaterThanOrEqual(COVERAGE_FLOOR);
	});
});

// =============================================================================
// Saisie atelier : `.domaine` via runInput, rendu exact
// =============================================================================

function domaineLine(input: string): string {
	const outcome = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
	if (outcome.kind !== 'commande') return `${outcome.kind}: ${JSON.stringify(outcome)}`;
	const line = (outcome.output ?? '').split('\n').find((l) => l.startsWith('Domaine :'));
	return line ?? `pas de ligne Domaine : ${outcome.output ?? ''}`;
}

const ATELIER_CASES: readonly (readonly [string, string])[] = [
	// les trois cas du signalement
	['.domaine 1/(x-1/2)', 'Domaine : ℝ \\ {1/2}'],
	['.domaine sqrt(x-1/3)', 'Domaine : [1/3 ; +∞['],
	['.domaine sqrt(3x-1)', 'Domaine : [1/3 ; +∞['],
	// rationnels
	['.domaine 1/(2x+5)', 'Domaine : ℝ \\ {-5/2}'],
	['.domaine ln(x-1/2)', 'Domaine : ]1/2 ; +∞['],
	['.domaine ln(3-2x)', 'Domaine : ]-∞ ; 3/2['],
	['.domaine 1/(6x^2-5x+1)', 'Domaine : ℝ \\ {1/3 ; 1/2}'],
	// irrationnels
	['.domaine 1/(x^2-2)', 'Domaine : ℝ \\ {-√2 ; √2}'],
	['.domaine 1/(2x^2-1)', 'Domaine : ℝ \\ {-√2/2 ; √2/2}'],
	['.domaine sqrt(x^2-x-1)', 'Domaine : ]-∞ ; (1-√5)/2] ∪ [(1+√5)/2 ; +∞['],
	// composées, valeur absolue
	['.domaine sqrt(ln(x))', 'Domaine : [1 ; +∞['],
	['.domaine ln(sqrt(x)-1)', 'Domaine : ]1 ; +∞['],
	['.domaine ln(abs(x)-1)', 'Domaine : ]-∞ ; -1[ ∪ ]1 ; +∞['],
	// périodiques
	['.domaine tan(x)', 'Domaine : ℝ \\ {π/2 + k·π : k ∈ ℤ}'],
	['.domaine tan(2x)', 'Domaine : ℝ \\ {π/4 + k·π/2 : k ∈ ℤ}'],
	['.domaine 1/sin(x)', 'Domaine : ℝ \\ {k·π : k ∈ ℤ}']
];

describe('oracle du domaine — `.domaine` dans l’atelier', () => {
	it.each(ATELIER_CASES)('%s → %s', (input, expected) => {
		expect(domaineLine(input)).toBe(expected);
	});

	it('contrainte non résolue : refus, jamais ℝ', () => {
		const outcome = runInput(
			{ atelier: new Atelier(), engine: new WebReplEngine() },
			'.domaine sqrt(sin(x))'
		);
		expect(outcome.kind).toBe('refus');
		expect(JSON.stringify(outcome)).not.toContain('Domaine');
	});

	it('la commande dit pourquoi elle refuse (code DOMAIN_UNRESOLVED)', () => {
		const result = new WebReplEngine().execute('.domain sqrt(sin(x))');
		expect(JSON.stringify(result)).toContain('Je ne sais pas encore déterminer ce domaine');
	});
});
