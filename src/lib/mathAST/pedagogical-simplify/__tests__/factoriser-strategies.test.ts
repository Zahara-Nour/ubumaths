/**
 * L'intention `factoriser` passe par des stratégies qui RACONTENT (ADR 0024, lot 2).
 *
 * Le noyau (`mathAST/factor/`) trouve la factorisation ; la stratégie la raconte
 * en étapes françaises. Enchaînement, la suivante si la précédente ne factorise
 * pas : 1 facteur commun · 2 identité remarquable (coefficients compris) ·
 * 3 facteur commun puis identité · 4 racines du trinôme (lycée) · 5 racine
 * évidente puis division (lycée) · 6 développer pour refactoriser (dernier
 * recours, étapes jetées si rien ne factorise ensuite).
 *
 * Décisions de David (2026-10-11, journal `moteur-factorisation-progress.md` §6) :
 * collège = stratégies 1, 2, 3, 6 ; lycée = toutes ; un seul ordre des facteurs,
 * celui du noyau (`x^2-4` → `(x-2)(x+2)`) ; trinôme en deux lignes,
 * `a(x-x₁)(x-x₂)` puis la forme à coefficients entiers.
 *
 * Chaque cas asserte le RENDU, l'équivalence avec l'entrée (étape par étape) et
 * la suite des règles. Entrées LaTeX PARSÉES, coefficients ≠ 1 dès que possible.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../../index';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import type { SchoolLevel } from '../../common/step-renderer-base';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { PedagogicalSimplifyRenderer } from '../renderer';
import { factorSteps } from '$lib/atelier/factor-steps';

type Level = Extract<SchoolLevel, 'college' | 'lycee'>;

function factoriser(source: string, schoolLevel: Level) {
	const input = parseLatex(source);
	const { result, steps } = generatePedagogicalSimplifySteps(input, {
		intent: 'factoriser',
		schoolLevel
	});
	const rendered = new PedagogicalSimplifyRenderer().renderAll(steps, {
		schoolLevel,
		verbosity: 'detailed'
	});
	return {
		input,
		result,
		steps,
		latex: toLatex(result),
		rules: steps.map((s) => s.rule),
		titles: rendered.map((s) => s.title)
	};
}

/** Le rendu, l'équivalence du résultat ET de chaque étape avec l'entrée. */
function expectFactored(source: string, level: Level, latex: string, rules: readonly string[]) {
	const run = factoriser(source, level);
	expect(run.latex).toBe(latex);
	expect(run.rules).toEqual(rules);
	expect(areEquivalent(run.result, run.input)).toBe(true);
	for (const step of run.steps) {
		expect(areEquivalent(step.globalAfter ?? step.after, run.input), step.rule).toBe(true);
	}
	for (const title of run.titles) {
		expect(title).not.toContain('Règle');
	}
	return run;
}

const BOTH: readonly Level[] = ['college', 'lycee'];

describe('stratégie 1 — facteur commun (inchangée)', () => {
	it.each(BOTH)('6x+9 → 3(2x+3) (%s)', (level) => {
		expectFactored('6x+9', level, '3 \\left( 2 x + 3 \\right)', ['common-factor-content-add']);
	});
});

describe('stratégie 2 — identité remarquable, coefficients compris', () => {
	it.each(BOTH)('4x²−25 → (2x−5)(2x+5), a = 2x et b = 5 (%s)', (level) => {
		const run = expectFactored(
			'4x^2-25',
			level,
			'\\left( 2 x - 5 \\right) \\left( 2 x + 5 \\right)',
			['diff-squares-numeric']
		);
		expect(run.titles[0]).toBe('On reconnaît a² − b² avec a = 2x et b = 5');
	});

	it.each(BOTH)('9x²−12x+4 → (3x−2)² (%s)', (level) => {
		const run = expectFactored('9x^2-12x+4', level, '\\left( 3 x - 2 \\right)^2', [
			'perfect-square-trinomial'
		]);
		expect(run.titles[0]).toBe('On reconnaît a² − 2ab + b² avec a = 3x et b = 2');
	});

	it.each(BOTH)('x²−4 → (x−2)(x+2) : l’ordre du noyau (%s)', (level) => {
		expectFactored('x^2-4', level, '\\left( x - 2 \\right) \\left( x + 2 \\right)', [
			'diff-squares-numeric'
		]);
	});

	it.each(BOTH)('(2x+1)²−(x−3)² → (3x−2)(x+4), facteurs RÉDUITS (%s)', (level) => {
		const run = expectFactored(
			'(2x+1)^2-(x-3)^2',
			level,
			'\\left( 3 x - 2 \\right) \\left( x + 4 \\right)',
			['diff-squares-symbolic', 'reduce-factors']
		);
		expect(run.titles[1]).toBe('On réduit chaque facteur');
	});
});

describe('stratégie 3 — facteur commun puis identité', () => {
	it.each(BOTH)('2x²−8 → 2(x²−4) → 2(x−2)(x+2) (%s)', (level) => {
		const run = expectFactored('2x^2-8', level, '2 \\left( x - 2 \\right) \\left( x + 2 \\right)', [
			'common-factor-content-sub',
			'diff-squares-numeric'
		]);
		expect(toLatex(run.steps[0].globalAfter!)).toBe('2 \\left( x^2 - 4 \\right)');
	});
});

describe('l’ordre du noyau, même devant un facteur non polynomial', () => {
	it.each(BOTH)('x²eˣ−4eˣ → (x−2)(x+2)eˣ (%s)', (level) => {
		expectFactored(
			'x^2e^x-4e^x',
			level,
			'\\left( x - 2 \\right) \\left( x + 2 \\right) \\exponentialE^x',
			['common-factor-content-sub', 'diff-squares-numeric']
		);
	});
});

describe('stratégie 4 — racines du trinôme (lycée seulement)', () => {
	it('2x²+x−3 → 2(x−1)(x+3/2) → (x−1)(2x+3)', () => {
		const run = expectFactored(
			'2x^2+x-3',
			'lycee',
			'\\left( x - 1 \\right) \\left( 2 x + 3 \\right)',
			['trinomial-roots', 'trinomial-integer-form']
		);
		expect(toLatex(run.steps[0].globalAfter!)).toBe(
			'2 \\left( x - 1 \\right) \\left( x + \\dfrac{3}{2} \\right)'
		);
		expect(run.titles[0]).toBe('On calcule Δ = 25 : deux racines, x₁ = 1 et x₂ = −3/2');
	});

	it('x²−5x+6 → (x−2)(x−3) en une seule ligne (a = 1, racines entières)', () => {
		expectFactored('x^2-5x+6', 'lycee', '\\left( x - 2 \\right) \\left( x - 3 \\right)', [
			'trinomial-roots'
		]);
	});

	it('3x²−15x+18 → 3(x²−5x+6) → 3(x−2)(x−3)', () => {
		expectFactored('3x^2-15x+18', 'lycee', '3 \\left( x - 2 \\right) \\left( x - 3 \\right)', [
			'common-factor-content-add',
			'trinomial-roots'
		]);
	});

	it('racines irrationnelles au lycée : 2x²−4x−2 → 2(x−1−√2)(x−1+√2)', () => {
		const run = expectFactored(
			'2x^2-4x-2',
			'lycee',
			'2 \\left( x - 1 - \\sqrt{2} \\right) \\left( x - 1 + \\sqrt{2} \\right)',
			['common-factor-content-sub', 'trinomial-roots']
		);
		expect(run.titles[1]).toBe('On calcule Δ = 8 : deux racines, x₁ = 1 + √2 et x₂ = 1 − √2');
	});

	it('x²−2x−1 → (x−1−√2)(x−1+√2)', () => {
		expectFactored(
			'x^2-2x-1',
			'lycee',
			'\\left( x - 1 - \\sqrt{2} \\right) \\left( x - 1 + \\sqrt{2} \\right)',
			['trinomial-roots']
		);
	});

	it('a < 0 et racines entières : une seule ligne, −x²+5x−6 → −(x−2)(x−3)', () => {
		expectFactored('-x^2+5x-6', 'lycee', '-\\left( x - 2 \\right) \\left( x - 3 \\right)', [
			'trinomial-roots'
		]);
	});

	it.each(['2x^2+x-3', 'x^2-5x+6', 'x^2-2x-1'])('au collège, %s reste inchangé', (source) => {
		const run = factoriser(source, 'college');
		expect(run.latex).toBe(toLatex(run.input));
		expect(run.steps).toEqual([]);
	});
});

describe('stratégie 5 — racine évidente puis division (lycée seulement)', () => {
	it('x³−6x²+11x−6 → (x−1)(x²−5x+6) → (x−1)(x−2)(x−3)', () => {
		const run = expectFactored(
			'x^3-6x^2+11x-6',
			'lycee',
			'\\left( x - 1 \\right) \\left( x - 2 \\right) \\left( x - 3 \\right)',
			['evident-root', 'trinomial-roots']
		);
		expect(run.titles[0]).toBe('1 est racine évidente : on factorise par (x − 1)');
		expect(toLatex(run.steps[0].globalAfter!)).toBe(
			'\\left( x - 1 \\right) \\left( x^2 - 5 x + 6 \\right)'
		);
	});

	it('2x³−12x²+22x−12 → 2(x−1)(x−2)(x−3)', () => {
		expectFactored(
			'2x^3-12x^2+22x-12',
			'lycee',
			'2 \\left( x - 1 \\right) \\left( x - 2 \\right) \\left( x - 3 \\right)',
			['common-factor-content-sub', 'evident-root', 'trinomial-roots']
		);
	});

	it('au collège, x³−6x²+11x−6 reste inchangé', () => {
		const run = factoriser('x^3-6x^2+11x-6', 'college');
		expect(run.latex).toBe(toLatex(run.input));
		expect(run.steps).toEqual([]);
	});
});

describe('stratégie 6 — développer pour refactoriser, en dernier recours', () => {
	it('lycée : x(x+1)−6 → x²+x−6 → (x−2)(x+3), étapes de développement montrées', () => {
		const run = factoriser('x(x+1)-6', 'lycee');
		expect(run.latex).toBe('\\left( x - 2 \\right) \\left( x + 3 \\right)');
		expect(areEquivalent(run.result, run.input)).toBe(true);
		expect(run.rules.at(-1)).toBe('trinomial-roots');
		const developed = run.steps.find((s) => s.rule === 'trinomial-roots')!;
		expect(toLatex(developed.globalBefore!)).toBe('x^2 + x - 6');
		expect(run.steps.filter((s) => s.category === 'factorisation')).toHaveLength(1);
		expect(run.steps.length).toBeGreaterThan(1);
	});

	it('collège : x(x+1)−6 reste l’ENTRÉE, sans étape de développement', () => {
		const run = factoriser('x(x+1)-6', 'college');
		expect(run.latex).toBe('x \\left( x + 1 \\right) - 6');
		expect(run.steps).toEqual([]);
	});

	it.each(BOTH)('x(4x+4)+1 → 4x²+4x+1 → (2x+1)² : une stratégie collège conclut (%s)', (level) => {
		const run = factoriser('x(4x+4)+1', level);
		expect(run.latex).toBe('\\left( 2 x + 1 \\right)^2');
		expect(areEquivalent(run.result, run.input)).toBe(true);
		expect(run.rules.at(-1)).toBe('perfect-square-trinomial');
	});
});

describe('a² − b² écrit à l’envers (constante devant) : l’identité, jamais Δ', () => {
	it.each(
		BOTH.flatMap((level) => [
			['9-x^2', '\\left( 3 - x \\right) \\left( 3 + x \\right)', 'a = 3 et b = x', level],
			['1-x^2', '\\left( 1 - x \\right) \\left( 1 + x \\right)', 'a = 1 et b = x', level],
			['-4x^2+9', '\\left( 3 - 2 x \\right) \\left( 3 + 2 x \\right)', 'a = 3 et b = 2x', level]
		])
	)('%s → %s (%s, %s)', (source, latex, names, level) => {
		const run = expectFactored(source, level as Level, latex, ['diff-squares-numeric']);
		expect(run.titles[0]).toBe(`On reconnaît a² − b² avec ${names}`);
	});

	it.each(BOTH)('-x³+x → x(1−x)(1+x), factorisation complète (%s)', (level) => {
		const run = factoriser('-x^3+x', level);
		expect(run.latex).toBe('x \\left( 1 - x \\right) \\left( 1 + x \\right)');
		expect(areEquivalent(run.result, run.input)).toBe(true);
		expect(run.rules.at(-1)).toBe('diff-squares-numeric');
		expect(run.rules).not.toContain('trinomial-roots');
	});
});

describe('chaque étape part de la précédente', () => {
	it.each(BOTH)(
		'(x+3)²−x² → 3(2x+3) : le facteur (x+3)−x est réduit DANS une étape (%s)',
		(level) => {
			expectFactored('(x+3)^2-x^2', level, '3 \\left( 2 x + 3 \\right)', [
				'diff-squares-symbolic',
				'reduce-factors'
			]);
		}
	);

	it.each(BOTH)('12x²−3 : pas de parenthèses doubles (%s)', (level) => {
		const run = expectFactored(
			'12x^2-3',
			level,
			'3 \\left( 2 x - 1 \\right) \\left( 2 x + 1 \\right)',
			['common-factor-content-sub', 'diff-squares-numeric']
		);
		for (const step of run.steps) {
			expect(toLatex(step.globalAfter!)).not.toContain('\\left( \\left(');
		}
	});

	it.each(BOTH)('x−x → 0 (%s)', (level) => {
		expect(factoriser('x-x', level).latex).toBe('0');
	});

	it.each(BOTH)('stratégie 6 : le développement est UNE étape (%s)', (level) => {
		for (const [source, latex] of [
			['x(x+2)+1', '\\left( x + 1 \\right)^2'],
			['(x+1)(x+3)+1', '\\left( x + 2 \\right)^2']
		]) {
			const run = factoriser(source, level);
			expect(run.latex).toBe(latex);
			expect(run.rules).toEqual(['develop-to-factor', 'perfect-square-trinomial']);
			expect(run.titles[0]).toBe('On développe et on réduit');
			expect(toLatex(run.steps[0].globalBefore!)).toBe(toLatex(run.input));
		}
	});

	const ALL = [
		'6x+9',
		'4x^2-25',
		'9x^2-12x+4',
		'x^2-4',
		'(2x+1)^2-(x-3)^2',
		'2x^2-8',
		'x^2e^x-4e^x',
		'2x^2+x-3',
		'x^2-5x+6',
		'3x^2-15x+18',
		'2x^2-4x-2',
		'x^2-2x-1',
		'-x^2+5x-6',
		'x^3-6x^2+11x-6',
		'2x^3-12x^2+22x-12',
		'x(x+1)-6',
		'x(4x+4)+1',
		'9-x^2',
		'-4x^2+9',
		'-x^3+x',
		'(x+3)^2-x^2',
		'12x^2-3',
		'(2x+1)(x-3)+(2x+1)(x+5)',
		'(x+1)(x+3)+1',
		'x(x+2)+1',
		'3(x+1)^2-6(x+1)',
		'xe^x-e^x',
		'x-x'
	];
	it.each(BOTH.flatMap((level) => ALL.map((source) => [source, level])))(
		'invariant : avant(n+1) = après(n), après(dernière) = résultat — %s (%s)',
		(source, level) => {
			const run = factoriser(source, level as Level);
			expect(areEquivalent(run.result, run.input)).toBe(true);
			run.steps.forEach((step, i) => {
				if (i > 0) {
					expect(toLatex(step.globalBefore!), `étape ${i} (${step.rule})`).toBe(
						toLatex(run.steps[i - 1].globalAfter!)
					);
				}
			});
			if (run.steps.length > 0) {
				expect(toLatex(run.steps[0].globalBefore!)).toBe(toLatex(run.input));
				expect(toLatex(run.steps.at(-1)!.globalAfter!)).toBe(run.latex);
			}
		}
	);
});

describe('inchangés : pas de faux « ne se factorise pas »', () => {
	it.each(BOTH.flatMap((level) => ['x^2+1', 'x+1', 'x^2+x+1', '2x^2+3'].map((s) => [s, level])))(
		'%s (%s)',
		(source, level) => {
			const run = factoriser(source, level as Level);
			expect(run.latex).toBe(toLatex(run.input));
			expect(run.steps).toEqual([]);
		}
	);

	it.each(BOTH)('xe^x + sin x (%s)', (level) => {
		const run = factoriser('xe^x+\\sin x', level);
		expect(run.latex).toBe('x \\exponentialE^x + \\sin\\left( x \\right)');
		expect(run.steps).toEqual([]);
	});
});

describe('plusieurs variables : le comportement par motifs reste', () => {
	it.each([
		['x^2-y^2', '\\left( x + y \\right) \\left( x - y \\right)'],
		['ax+ay', 'a \\left( x + y \\right)']
	])('%s → %s', (source, latex) => {
		expect(factoriser(source, 'lycee').latex).toBe(latex);
	});
});

describe('l’atelier (`.factoriser`, niveau lycée)', () => {
	it('4x^2-25 : une étape qui nomme a et b', () => {
		const outcome = factorSteps('4x^2-25');
		expect(outcome.kind).toBe('factorisee');
		if (outcome.kind !== 'factorisee') return;
		expect(outcome.answer).toBe('\\left( 2 x - 5 \\right) \\left( 2 x + 5 \\right)');
		expect(outcome.steps.map((s) => s.title)).toEqual([
			'On reconnaît a² − b² avec a = 2x et b = 5'
		]);
	});

	it('2x^2+x-3 : Δ, puis les coefficients entiers', () => {
		const outcome = factorSteps('2x^2+x-3');
		expect(outcome.kind).toBe('factorisee');
		if (outcome.kind !== 'factorisee') return;
		expect(outcome.answer).toBe('\\left( x - 1 \\right) \\left( 2 x + 3 \\right)');
		expect(outcome.steps).toHaveLength(2);
		expect(outcome.steps[0].title).toContain('Δ = 25');
	});
});
