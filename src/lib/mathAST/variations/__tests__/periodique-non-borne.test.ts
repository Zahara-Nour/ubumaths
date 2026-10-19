/**
 * Variations : dérivée à zéros PÉRIODIQUES sur un intervalle non borné
 *
 * Deux défauts, de sens opposés :
 * - sur main, `cos(πx/180)` était « croissante sur ]−∞ ; 0[, décroissante sur
 *   ]0 ; +∞[, maximum local en 0 » : l'échantillonnage dans [−100 ; 100] ne
 *   voyait pas les zéros ±180 de la dérivée ;
 * - le premier correctif coupait l'échantillonnage et perdait des sens JUSTES :
 *   `x − sin x` (f′ = 1 − cos x ≥ 0, zéros doubles) devenait « sens inconnu ».
 *
 * Règle : le signe de f′ périodique se lit sur une période entière (voir
 * `sign/__tests__/periodique-non-borne.test.ts`).
 *
 * Le second bloc est un oracle numérique sur un échantillon large (38 fonctions
 * × 7 domaines) : tout ce que le tableau AFFIRME (signe, sens) est vérifié sur
 * une grille fine, et un tableau qui doit se conclure se conclut.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { analyzeSign } from '../../sign/analyze';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import {
	closedEndpoint,
	interval,
	negInfinityEndpoint,
	openEndpoint,
	posInfinityEndpoint
} from '$lib/math/intervals/factory';
import type { Domain } from '../../domain/types';
import type { Interval } from '$lib/math/intervals/types';
import type { VariationResult } from '../types';

function endpoint(latex: string, closed: boolean) {
	if (latex === '-inf') return negInfinityEndpoint();
	if (latex === '+inf') return posInfinityEndpoint();
	return closed ? closedEndpoint(parseLatex(latex)) : openEndpoint(parseLatex(latex));
}

function domainOf(lo: string, hi: string, closedLo: boolean, closedHi: boolean): Domain {
	return {
		kind: 'interval_set',
		intervals: [interval(endpoint(lo, closedLo), endpoint(hi, closedHi))],
		excludedPoints: []
	};
}

const DOMAINS: Readonly<Record<string, Domain | undefined>> = {
	ℝ: undefined,
	'[0 ; 2π]': domainOf('0', '2\\pi', true, true),
	'[−π ; π]': domainOf('-\\pi', '\\pi', true, true),
	'[0 ; +∞[': domainOf('0', '+inf', true, false),
	']0 ; +∞[': domainOf('0', '+inf', false, false),
	'[0 ; 360]': domainOf('0', '360', true, true),
	'[−10 ; 10]': domainOf('-10', '10', true, true)
};

const UNBOUNDED = ['ℝ', '[0 ; +∞[', ']0 ; +∞['] as const;

function study(latex: string, domain?: Domain): VariationResult {
	return computeVariations(parseLatex(latex), { variable: 'x', ...(domain && { domain }) });
}

/** Les sens de variation, intervalles dégénérés {c} retirés. */
function directions(result: VariationResult): string[] {
	return result.monotonicIntervals
		.filter((mi) => mi.monotonicity !== 'constant')
		.map((mi) => mi.monotonicity);
}

describe('f′ périodique à zéros doubles : le sens se conclut', () => {
	for (const name of UNBOUNDED) {
		it(`x − sin x croissante sur ${name}`, () => {
			const dirs = directions(study('x-\\sin(x)', DOMAINS[name]));
			expect(dirs.length).toBeGreaterThan(0);
			expect(dirs.every((d) => d === 'increasing')).toBe(true);
		});

		it(`x + sin x croissante sur ${name}`, () => {
			const dirs = directions(study('x+\\sin(x)', DOMAINS[name]));
			expect(dirs.length).toBeGreaterThan(0);
			expect(dirs.every((d) => d === 'increasing')).toBe(true);
		});

		it(`cos x − x décroissante sur ${name}`, () => {
			const dirs = directions(study('\\cos(x)-x', DOMAINS[name]));
			expect(dirs.length).toBeGreaterThan(0);
			expect(dirs.every((d) => d === 'decreasing')).toBe(true);
		});
	}

	it('x − sin x : aucun extremum local sur ℝ', () => {
		expect(study('x-\\sin(x)').extrema).toEqual([]);
	});
});

describe('f′ périodique à zéros simples : pas de tableau inventé', () => {
	it('cos(πx/180) sur ℝ : aucun maximum local inventé en 0', () => {
		const result = study('\\cos(\\frac{\\pi x}{180})');
		expect(result.extrema).toEqual([]);
		expect(directions(result).every((d) => d === 'unknown')).toBe(true);
	});

	it('cos x sur ℝ : décroissante sur ]0 ; π[, inconnu au-delà, aucun extremum', () => {
		const result = study('\\cos(x)');
		expect(directions(result)).toEqual(['unknown', 'decreasing', 'unknown']);
		expect(result.extrema).toEqual([]);
	});

	it('cos(πx/180) sur [0 ; 360] : étude complète (domaine borné)', () => {
		expect(directions(study('\\cos(\\frac{\\pi x}{180})', DOMAINS['[0 ; 360]']))).toEqual([
			'decreasing',
			'increasing'
		]);
	});
});

// =============================================================================
// Oracle numérique sur un échantillon large
// =============================================================================

const EXPRESSIONS = [
	'\\sin(x)',
	'\\cos(x)',
	'\\tan(x)',
	'\\sin(2x)',
	'3\\cos(2x)',
	'\\cos(x)+1',
	'1-\\sin(x)',
	'x+\\sin(x)',
	'x-\\sin(x)',
	'2x+\\cos(x)',
	'\\frac{\\sin(x)}{x}',
	'x\\sin(x)',
	'\\cos(\\frac{\\pi x}{180})',
	'\\sin(x)^2',
	'\\cos(x)^2',
	'2\\sin(x)-1',
	'2\\cos(x)-\\sqrt{3}',
	'e^{x}\\cos(x)',
	'e^{-x}\\sin(x)',
	'(x-10)\\sin(x)',
	'\\sin(x)+\\cos(x)',
	'\\cos(x)-x',
	'\\sin(x)+2',
	'\\cos(x)\\sin(x)',
	'x^2-4',
	'3x^2-12x+9',
	'\\frac{2x-1}{x+3}',
	'x^3-3x',
	'2xe^{x}',
	'\\ln(x)',
	'x\\ln(x)',
	'|x-3|',
	'\\frac{e^x}{x}',
	'-2x^2+4x+6',
	'\\sqrt{x}-2',
	'(x-7)\\sin(x)',
	'(x-20)\\sin(x)',
	'x+\\cos(x)+\\cos(x)^2'
];

/** Fonctions dont le tableau doit se conclure sur TOUT domaine (aucune périodicité). */
const NON_PERIODIC = new Set([
	'x^2-4',
	'3x^2-12x+9',
	'\\frac{2x-1}{x+3}',
	'x^3-3x',
	'2xe^{x}',
	'\\ln(x)',
	'x\\ln(x)',
	'|x-3|',
	'\\frac{e^x}{x}',
	'-2x^2+4x+6',
	'\\sqrt{x}-2'
]);

/** Fonctions trigonométriques dont le tableau se conclut sur un domaine BORNÉ. */
const BOUNDED_DOMAINS = ['[0 ; 2π]', '[−π ; π]', '[0 ; 360]', '[−10 ; 10]'];

/**
 * Les domaines où étudier f : ceux de l'échantillon CONTENUS dans son ensemble de
 * définition (un domaine donné qui contient un pôle n'est pas un cas d'élève).
 */
const NATURAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
	'\\tan(x)': ['ℝ'],
	'\\frac{\\sin(x)}{x}': ['ℝ', ']0 ; +∞['],
	'\\frac{2x-1}{x+3}': ['ℝ', '[0 ; 2π]', '[0 ; +∞[', ']0 ; +∞[', '[0 ; 360]'],
	'\\ln(x)': [']0 ; +∞['],
	'x\\ln(x)': [']0 ; +∞['],
	'\\frac{e^x}{x}': ['ℝ', ']0 ; +∞['],
	'\\sqrt{x}-2': ['[0 ; +∞[', ']0 ; +∞[', '[0 ; 2π]', '[0 ; 360]']
};

function domainsFor(latex: string): readonly string[] {
	return NATURAL_DOMAINS[latex] ?? Object.keys(DOMAINS);
}

/**
 * Défauts connus, antérieurs, hors de ce correctif : `it.fails` les garde
 * visibles (le test passera au rouge le jour où ils seront corrigés).
 * - `tan x` sur ℝ : « croissante sur ]−∞ ; +∞[ » d'un seul tenant, à travers
 *   les asymptotes (croissante sur chaque ]−π/2 + kπ ; π/2 + kπ[ seulement).
 */
const KNOWN_DEFECTS = new Set(['\\tan(x) sur ℝ']);

/** Marge : une valeur plus petite compte pour un zéro (contact, pas changement de signe). */
const EPS = 1e-9;

/** Une grille dans l'intervalle (200 unités après une borne finie, sinon [−200 ; 200]). */
function grid(int: Interval): number[] {
	let lo = endpointToNumber(int.lower.value);
	let hi = endpointToNumber(int.upper.value);
	if (lo === -Infinity && hi === Infinity) [lo, hi] = [-200, 200];
	else if (lo === -Infinity) lo = hi - 200;
	else if (hi === Infinity) hi = lo + 200;
	const points: number[] = [];
	const steps = 4000;
	for (let i = 1; i < steps; i++) points.push(lo + ((hi - lo) * i) / steps);
	return points;
}

/** Les affirmations fausses du tableau de signes et de variations de f sur le domaine. */
function falseClaims(latex: string, domain: Domain | undefined): string[] {
	const f = compile(parseLatex(latex));
	const valuesOn = (int: Interval): number[] =>
		grid(int)
			.map((x) => f({ x }))
			.filter((v) => Number.isFinite(v));
	const problems: string[] = [];

	const sign = analyzeSign(parseLatex(latex), { variable: 'x', ...(domain && { domain }) });
	for (const si of sign.signedIntervals) {
		if (si.sign !== 'positive' && si.sign !== 'negative') continue;
		const wrong = valuesOn(si.interval).filter((v) =>
			si.sign === 'positive' ? v < -EPS : v > EPS
		);
		if (wrong.length > 0) problems.push(`signe ${si.sign} faux sur ${show(si.interval)}`);
	}

	let variations: VariationResult | undefined;
	try {
		variations = study(latex, domain);
	} catch {
		variations = undefined;
	}
	for (const mi of variations?.monotonicIntervals ?? []) {
		if (mi.monotonicity !== 'increasing' && mi.monotonicity !== 'decreasing') continue;
		const values = valuesOn(mi.interval);
		const broken = values.some((v, i) => {
			if (i === 0) return false;
			const delta = v - values[i - 1];
			return mi.monotonicity === 'increasing' ? delta < -EPS : delta > EPS;
		});
		if (broken) problems.push(`sens ${mi.monotonicity} faux sur ${show(mi.interval)}`);
	}
	return problems;
}

function show(int: Interval): string {
	return `]${endpointToNumber(int.lower.value).toFixed(3)} ; ${endpointToNumber(int.upper.value).toFixed(3)}[`;
}

describe('oracle : ce que le tableau affirme est vrai', () => {
	for (const latex of EXPRESSIONS) {
		for (const name of domainsFor(latex)) {
			const known = KNOWN_DEFECTS.has(`${latex} sur ${name}`);
			(known ? it.fails : it)(`${latex} sur ${name}`, () => {
				expect(falseClaims(latex, DOMAINS[name])).toEqual([]);
			});
		}
	}
});

describe('oracle : ce qui se démontre se conclut', () => {
	for (const latex of EXPRESSIONS) {
		for (const name of domainsFor(latex)) {
			const mustConclude = NON_PERIODIC.has(latex) || BOUNDED_DOMAINS.includes(name);
			if (!mustConclude) continue;
			it(`${latex} sur ${name} : aucun signe inconnu`, () => {
				const sign = analyzeSign(parseLatex(latex), {
					variable: 'x',
					...(DOMAINS[name] && { domain: DOMAINS[name] })
				});
				// f(x) = 0 non résolue (x + sin x = 0) : rien ne se démontre, et le
				// tableau le dit.
				if (sign.zerosUnresolved) {
					expect(sign.warnings?.length).toBeGreaterThan(0);
					return;
				}
				expect(
					sign.signedIntervals.filter((si) => si.sign === 'unknown').map((si) => show(si.interval))
				).toEqual([]);
			});
		}
	}
});
