/**
 * Tests du calcul exact des termes d'une suite.
 *
 * Le décimal répond « où est le point » ; l'exact répond « quelle est la
 * valeur ». Les deux cohabitent, et l'exact n'est pas toujours atteignable :
 * ces tests disent précisément quand.
 */

import { describe, it, expect } from 'vitest';
import { parseSequence } from '$lib/grapheur/sequence';
import { exactTermValue, exactTermValues } from '$lib/grapheur/exact';
import { toLatex } from '$lib/mathAST/latex-generator';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Helper Functions
// =============================================================================

/** Build the compute spec the way the grapheur does, then ask for a rank. */
function exactOf(
	latex: string,
	rank: number,
	options: {
		mode?: 'explicit' | 'recurrence';
		firstIndex?: number;
		firstTerm?: number | null;
		bindings?: Record<string, number>;
	} = {}
): MathNode | null {
	const mode = options.mode ?? 'explicit';
	const parsed = parseSequence(latex, mode, 'u', Object.keys(options.bindings ?? {}));
	expect(parsed.error).toBeNull();

	return exactTermValue(
		{
			mode,
			ast: parsed.ast!,
			firstIndex: options.firstIndex ?? 0,
			firstTerm: options.firstTerm ?? null,
			bindings: options.bindings ?? {}
		},
		rank
	);
}

const latexOf = (node: MathNode | null) => (node ? toLatex(node) : null);

// =============================================================================
// Suites explicites
// =============================================================================

describe('exactTermValue — suite explicite', () => {
	it('rend la fraction exacte, pas son approximation', () => {
		expect(latexOf(exactOf('3\\cdot\\left(-\\frac12\\right)^n', 3))).toBe('-\\dfrac{3}{8}');
	});

	it('rend le premier terme', () => {
		expect(latexOf(exactOf('3\\cdot\\left(-\\frac12\\right)^n', 0))).toBe('3');
	});

	it('garde un irrationnel sous forme symbolique', () => {
		expect(latexOf(exactOf('\\sqrt{n}', 2))).toBe('\\sqrt{2}');
	});

	it('réduit la fraction', () => {
		expect(latexOf(exactOf('\\frac{n}{6}', 4))).toBe('\\dfrac{2}{3}');
	});

	it('lie les paramètres du grapheur', () => {
		expect(latexOf(exactOf('a n', 5, { bindings: { a: 2 } }))).toBe('10');
	});

	it('refuse un rang antérieur au premier', () => {
		expect(exactOf('3n', 2, { firstIndex: 5 })).toBeNull();
	});
});

// =============================================================================
// Suites récurrentes
// =============================================================================

describe('exactTermValue — récurrence', () => {
	it('itère exactement depuis le premier terme', () => {
		// u0 = 8, u1 = 7, u2 = 13/2, u3 = 25/4
		expect(latexOf(exactOf('\\frac{u_n}{2}+3', 3, { mode: 'recurrence', firstTerm: 8 }))).toBe(
			'\\dfrac{25}{4}'
		);
	});

	it('lit un premier terme décimal comme la fraction qu’il est', () => {
		// u0 = 0.1 vaut 1/10, et u1 = 1/10 + 1 = 11/10.
		expect(latexOf(exactOf('u_n+1', 1, { mode: 'recurrence', firstTerm: 0.1 }))).toBe(
			'\\dfrac{11}{10}'
		);
	});

	it('honore un premier rang qui n’est pas 0', () => {
		expect(latexOf(exactOf('u_n+1', 3, { mode: 'recurrence', firstIndex: 1, firstTerm: 0 }))).toBe(
			'2'
		);
	});

	it('calcule la même suite tant qu’elle reste lisible', () => {
		// Le rang 5 de u² - 1 tient en quelques chiffres : le refus du rang 40
		// vient bien de la taille, pas d'un renoncement de principe.
		// u0 = 1/2, u1 = -3/4, u2 = -7/16, u3 = -207/256, u4 = -22687/65536.
		expect(latexOf(exactOf('u_n^2-1', 5, { mode: 'recurrence', firstTerm: 0.5 }))).toBe(
			'-\\dfrac{3780267327}{4294967296}'
		);
	});

	it('renonce quand l’expression exacte enfle', () => {
		// u_{n+1} = u_n² - 1 double la taille du numérateur à chaque rang :
		// l'exact existe, mais plus personne ne peut le lire.
		expect(exactOf('u_n^2-1', 40, { mode: 'recurrence', firstTerm: 0.5 })).toBeNull();
	});

	it('renonce sans premier terme', () => {
		expect(exactOf('u_n+1', 3, { mode: 'recurrence', firstTerm: null })).toBeNull();
	});

	it('renonce au-delà du plafond de rangs', () => {
		expect(exactOf('u_n+1', 5000, { mode: 'recurrence', firstTerm: 0 })).toBeNull();
	});
});

// =============================================================================
// Colonne entière
// =============================================================================

describe('exactTermValues', () => {
	/** Même construction que exactOf, mais pour toute une colonne. */
	function exactColumn(
		latex: string,
		lastIndex: number,
		options: {
			mode?: 'explicit' | 'recurrence';
			firstIndex?: number;
			firstTerm?: number | null;
		} = {}
	): Map<number, string> {
		const mode = options.mode ?? 'explicit';
		const parsed = parseSequence(latex, mode, 'u');
		expect(parsed.error).toBeNull();

		const values = exactTermValues(
			{
				mode,
				ast: parsed.ast!,
				firstIndex: options.firstIndex ?? 0,
				firstTerm: options.firstTerm ?? null,
				bindings: {}
			},
			lastIndex
		);

		return new Map([...values].map(([rank, node]) => [rank, toLatex(node)]));
	}

	it('rend chaque rang d’une suite explicite', () => {
		const column = exactColumn('\\frac{n}{6}', 3);

		expect(column.get(0)).toBe('0');
		expect(column.get(2)).toBe('\\dfrac{1}{3}');
		expect(column.get(3)).toBe('\\dfrac{1}{2}');
		expect(column.size).toBe(4);
	});

	// Une récurrence se déroule une seule fois pour toute la colonne : la
	// recalculer par ligne coûterait le carré du nombre de lignes.
	it('déroule la récurrence une seule fois', () => {
		const column = exactColumn('\\frac{u_n}{2}+3', 3, { mode: 'recurrence', firstTerm: 8 });

		expect([...column.values()]).toEqual(['8', '7', '\\dfrac{13}{2}', '\\dfrac{25}{4}']);
	});

	it('s’arrête au rang où l’exact devient illisible', () => {
		const column = exactColumn('u_n^2-1', 40, { mode: 'recurrence', firstTerm: 0.5 });

		// Les premiers rangs tiennent, les suivants non : la colonne s'arrête là
		// plutôt que de rendre des monstres.
		expect(column.get(0)).toBe('\\dfrac{1}{2}');
		expect(column.size).toBeLessThan(20);
		expect(column.has(40)).toBe(false);
	});

	it('ne rend rien sans premier terme', () => {
		expect(exactColumn('u_n+1', 5, { mode: 'recurrence', firstTerm: null }).size).toBe(0);
	});

	it('commence au premier rang de la suite', () => {
		const column = exactColumn('2n', 4, { firstIndex: 2 });

		expect([...column.keys()]).toEqual([2, 3, 4]);
	});
});
