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
 * Le second bloc est un oracle numérique sur un échantillon large (55 fonctions
 * × 7 domaines, plus des domaines qui contiennent des valeurs interdites) : tout
 * ce que le tableau AFFIRME (signe, sens, extremum : valeur, position, nature
 * locale ou globale) est vérifié sur une grille fine, aucun extremum de la
 * grille ne manque quand le tableau se conclut, et un tableau qui doit se
 * conclure se conclut.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { analyzeSign } from '../../sign/analyze';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import { computeDomain, normalizeExcludedPoints } from '../../domain/compute';
import { formatInterval } from '../../domain/format';
import { toLatex } from '../../latex-generator';
import { tidy } from '../../tidy';
import { containsValue, intersect } from '../../domain/algebra';
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

/**
 * Domaines qui contiennent une valeur interdite de certaines fonctions (π/2
 * pour tan, 0 pour 1/x) : le moteur les reçoit tels quels, comme quand un
 * appelant ne les restreint pas, et doit couper l'étude aux valeurs interdites.
 */
const POLE_DOMAINS: Readonly<Record<string, Domain | undefined>> = {
	'[0 ; π]': domainOf('0', '\\pi', true, true),
	'[−3 ; 3]': domainOf('-3', '3', true, true),
	'[−2 ; 3]': domainOf('-2', '3', true, true),
	']−π/2 ; π/2[': domainOf('-\\frac{\\pi}{2}', '\\frac{\\pi}{2}', false, false)
};

function domainNamed(name: string): Domain | undefined {
	return name in DOMAINS ? DOMAINS[name] : POLE_DOMAINS[name];
}

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

/** Les extrema, `type@x` avec x arrondi au millième. */
function extremaOf(result: VariationResult): string[] {
	return result.extrema.map((e) => `${e.type}@${compile(e.x)({}).toFixed(3)}`).sort();
}

describe("extrema d'une fonction trigonométrique sur un intervalle borné", () => {
	it('sin x sur [0 ; 2π] : maximum 1 en π/2, minimum −1 en 3π/2, rien en 0 ni en 2π', () => {
		const result = study('\\sin(x)', DOMAINS['[0 ; 2π]']);
		expect(extremaOf(result)).toEqual(['global_maximum@1.571', 'global_minimum@4.712']);
		const min = result.extrema.find((e) => e.type === 'global_minimum');
		expect(min && compile(min.y)({})).toBe(-1);
	});

	it('3 cos 2x sur [0 ; 2π] : minimum −3 en π/2 et en 3π/2', () => {
		const result = study('3\\cos(2x)', DOMAINS['[0 ; 2π]']);
		expect(extremaOf(result).filter((e) => e.startsWith('global_minimum'))).toEqual([
			'global_minimum@1.571',
			'global_minimum@4.712'
		]);
	});

	it('e^{−x} sin x sur [0 ; +∞[ : sens inconnu au-delà de π/4, aucun extremum global', () => {
		const result = study('e^{-x}\\sin(x)', DOMAINS['[0 ; +∞[']);
		expect(result.extrema.filter((e) => e.type.startsWith('global'))).toEqual([]);
	});
});

describe('valeurs interdites : le sens ne les traverse pas', () => {
	it('tan x sur ℝ : croissante sur ]−π/2 ; π/2[, inconnu au-delà, avertissement', () => {
		const result = study('\\tan(x)');
		expect(directions(result)).toEqual(['unknown', 'increasing', 'unknown']);
		const [, middle] = result.monotonicIntervals;
		expect(show(middle.interval)).toBe(']-1.571 ; 1.571[');
		expect(result.warnings?.some((w) => w.includes('chaque intervalle de définition'))).toBe(true);
		expect(result.extrema).toEqual([]);
	});

	it('tan x sur [0 ; π] : croissante sur [0 ; π/2[ et sur ]π/2 ; π], aucun extremum global', () => {
		const result = study('\\tan(x)', POLE_DOMAINS['[0 ; π]']);
		expect(result.monotonicIntervals.map((mi) => show(mi.interval))).toEqual([
			']0.000 ; 1.571[',
			']1.571 ; 3.142['
		]);
		expect(directions(result)).toEqual(['increasing', 'increasing']);
		expect(result.extrema).toEqual([]);
	});

	it("1/x sur [−2 ; 3] : décroissante de part et d'autre de 0, aucun extremum global", () => {
		const result = study('\\frac{1}{x}', POLE_DOMAINS['[−2 ; 3]']);
		expect(directions(result)).toEqual(['decreasing', 'decreasing']);
		expect(result.extrema).toEqual([]);
	});
});

/** Les extrema, `type@x=y` avec x et y arrondis au millième. */
function extremaWithValues(result: VariationResult): string[] {
	return result.extrema
		.map((e) => `${e.type}@${compile(e.x)({}).toFixed(3)}=${compile(e.y)({}).toFixed(3)}`)
		.sort();
}

describe('quotient dont le numérateur a des zéros périodiques', () => {
	// Le solveur rendait les zéros d'une période du numérateur (±π/2) sans la
	// famille : sur un intervalle borné, 3π/2, 5π/2… manquaient, et le tableau
	// restait « inconnu » là où il se démontre.
	it('cos x/(x² + 1) sur [0 ; 2π] : signe + 0 − 0 +', () => {
		const sign = analyzeSign(parseLatex('\\frac{\\cos(x)}{x^2+1}'), {
			variable: 'x',
			domain: DOMAINS['[0 ; 2π]']
		});
		expect(sign.signedIntervals.map((si) => si.sign)).toEqual([
			'positive',
			'zero',
			'negative',
			'zero',
			'positive'
		]);
	});

	it('cos x/(x² + 1) sur [−10 ; 10] : six zéros, de −5π/2 à 5π/2', () => {
		const sign = analyzeSign(parseLatex('\\frac{\\cos(x)}{x^2+1}'), {
			variable: 'x',
			domain: DOMAINS['[−10 ; 10]']
		});
		expect(sign.zeros.map((z) => compile(z.value)({}).toFixed(3))).toEqual([
			'-7.854',
			'-4.712',
			'-1.571',
			'1.571',
			'4.712',
			'7.854'
		]);
		expect(sign.signedIntervals.some((si) => si.sign === 'unknown')).toBe(false);
	});

	it('cos x/(x² + 1) : f′(x) = 0 non résolue, aucun sens affirmé', () => {
		// f′ = (−(x² + 1) sin x − 2x cos x)/(x² + 1)² : tan x = −2x/(x² + 1)
		// n'a pas de solution exacte — « inconnu » est la réponse honnête.
		const result = study('\\frac{\\cos(x)}{x^2+1}', DOMAINS['[0 ; 2π]']);
		expect(result.derivativeZerosUnresolved).toBe(true);
		expect(directions(result)).toEqual([]);
	});

	it('1/sin x sur [0 ; 2π] : ↘ ↗ | ↗ ↘, minimum 1 en π/2, maximum −1 en 3π/2', () => {
		const result = study('\\frac{1}{\\sin(x)}', DOMAINS['[0 ; 2π]']);
		expect(directions(result)).toEqual(['decreasing', 'increasing', 'increasing', 'decreasing']);
		expect(extremaWithValues(result)).toEqual([
			'local_maximum@4.712=-1.000',
			'local_minimum@1.571=1.000'
		]);
	});

	it('1/sin x sur ℝ : sens connu sur ]−π/2 ; π/2[ seulement, aucun extremum', () => {
		const result = study('\\frac{1}{\\sin(x)}');
		expect(directions(result)).toEqual(['unknown', 'decreasing', 'decreasing', 'unknown']);
		expect(result.extrema).toEqual([]);
	});

	it('ln(2 + sin x) sur [0 ; 2π] : ↗ ↘ ↗, maximum ln 3 en π/2, minimum 0 en 3π/2', () => {
		const result = study('\\ln(2+\\sin(x))', DOMAINS['[0 ; 2π]']);
		expect(directions(result)).toEqual(['increasing', 'decreasing', 'increasing']);
		expect(extremaWithValues(result)).toEqual([
			`global_maximum@1.571=${Math.log(3).toFixed(3)}`,
			'global_minimum@4.712=0.000'
		]);
	});

	it('ln(2 + sin x) sur [−10 ; 10] : six extrema, de −5π/2 à 5π/2', () => {
		const result = study('\\ln(2+\\sin(x))', DOMAINS['[−10 ; 10]']);
		expect(directions(result)).toEqual([
			'decreasing',
			'increasing',
			'decreasing',
			'increasing',
			'decreasing',
			'increasing',
			'decreasing'
		]);
		expect(extremaOf(result)).toHaveLength(6);
	});

	it('ln(2 + sin x) sur [0 ; +∞[ : croissante sur [0 ; π/2[, inconnu au-delà', () => {
		const result = study('\\ln(2+\\sin(x))', DOMAINS['[0 ; +∞[']);
		expect(directions(result)).toEqual(['increasing', 'unknown']);
		expect(result.extrema).toEqual([]);
	});

	it('ln(2 + sin x) sur [0 ; +∞[ : signe nul en 3π/2, jamais « positif » sans zéro', () => {
		// Le solveur rend −π/2, hors du domaine : le premier zéro au-delà de la
		// borne 0 manquait, et le tableau disait « positif sur [0 ; +∞[ ».
		const sign = analyzeSign(parseLatex('\\ln(2+\\sin(x))'), {
			variable: 'x',
			domain: DOMAINS['[0 ; +∞[']
		});
		expect(sign.zeros.map((z) => compile(z.value)({}).toFixed(3))).toEqual(['4.712']);
	});

	it('cos x/eˣ sur [0 ; +∞[ : décroissante sur [0 ; 3π/4[, inconnu au-delà', () => {
		// main : « croissante sur [0 ; +∞[ » (f′ = −(sin x + cos x)/eˣ, zéros
		// −π/4 + kπ, aucun dans la liste rendue par le solveur)
		const result = study('\\frac{\\cos(x)}{e^x}', DOMAINS['[0 ; +∞[']);
		expect(directions(result)).toEqual(['decreasing', 'unknown']);
		expect(result.extrema).toEqual([]);
	});

	it('ln(2 + sin x) sur ℝ : refus (domaine 2 + sin x > 0 non déterminé), jamais un tableau faux', () => {
		expect(() => study('\\ln(2+\\sin(x))')).toThrow(/domaine de définition/);
	});
});

describe('dénominateur ou f à domaine restreint : aucun zéro ni sens hors du domaine', () => {
	// Domaine fourni brut, qui déborde l'ensemble de définition (comme le
	// reçoit un appelant qui ne le restreint pas)
	function zerosOf(latex: string, domain: Domain): number[] {
		return analyzeSign(parseLatex(latex), { variable: 'x', domain }).zeros.map((z) =>
			compile(z.value)({})
		);
	}

	it('cos x/√x sur [−5 ; 5] : zéros π/2 et 3π/2, jamais −π/2 ni −3π/2', () => {
		// Famille écartée par le solveur (√x non définie sur ℝ), énumérée par le
		// tableau de signes membre à membre dans le domaine de l'expression
		const zeros = zerosOf('\\frac{\\cos(x)}{\\sqrt{x}}', domainOf('-5', '5', true, true));
		expect(zeros.map((z) => z.toFixed(3))).toEqual(['1.571', '4.712']);
	});

	it('sin x/x sur [0 ; 2π] : positif sur ]0 ; π[, négatif sur ]π ; 2π[ (0 n’est pas un zéro)', () => {
		const sign = analyzeSign(parseLatex('\\frac{\\sin(x)}{x}'), {
			variable: 'x',
			domain: restricted('\\frac{\\sin(x)}{x}', DOMAINS['[0 ; 2π]'])
		});
		expect(sign.zeros.map((z) => compile(z.value)({}).toFixed(3))).toEqual(['3.142', '6.283']);
		expect(sign.signedIntervals.map((si) => si.sign)).toEqual([
			'positive',
			'zero',
			'negative',
			'zero'
		]);
	});

	it('cos x/√x sur [−3 ; 3] : aucun zéro négatif', () => {
		const zeros = zerosOf('\\frac{\\cos(x)}{\\sqrt{x}}', domainOf('-3', '3', true, true));
		expect(zeros.every((z) => z > 0)).toBe(true);
	});

	it('cos x/√(x + 5) sur [−10 ; 10] : aucun zéro sous −5', () => {
		const zeros = zerosOf('\\frac{\\cos(x)}{\\sqrt{x+5}}', domainOf('-10', '10', true, true));
		expect(zeros.every((z) => z > -5)).toBe(true);
	});

	it('cos x/ln x sur [−5 ; 5] : aucun zéro négatif', () => {
		const zeros = zerosOf('\\frac{\\cos(x)}{\\ln(x)}', domainOf('-5', '5', true, true));
		expect(zeros.every((z) => z > 0)).toBe(true);
	});

	it('cos x/tan x sur [0 ; 2π] : aucun zéro en π/2 ni 3π/2 (tan non définie)', () => {
		expect(zerosOf('\\frac{\\cos(x)}{\\tan(x)}', DOMAINS['[0 ; 2π]']!)).toEqual([]);
	});

	it('ln(sin x) sur [0 ; 2π] : aucun sens affirmé sur ]π ; 2π[, où f n’est pas définie', () => {
		const result = study('\\ln(\\sin(x))', DOMAINS['[0 ; 2π]']);
		const affirmed = result.monotonicIntervals.filter(
			(mi) => mi.monotonicity === 'increasing' || mi.monotonicity === 'decreasing'
		);
		expect(affirmed.length).toBeGreaterThan(0);
		for (const mi of affirmed) {
			expect(endpointToNumber(mi.interval.upper.value)).toBeLessThanOrEqual(Math.PI + 1e-9);
		}
	});
});

describe('(x − 1)²(x + 2)³ : f′ = (x − 1)(x + 2)²(5x + 1)', () => {
	// La quartique f′ = 5x⁴ + 16x³ + 3x² − 20x − 4 passait par une factorisation de
	// Ferrari fausse : points critiques −2,45 ; −1,03 ; −0,85 ; 1,12.
	it('sur ℝ : ↗ jusqu’à −1/5 (aucun extremum en −2), ↘ jusqu’à 1, puis ↗', () => {
		const result = study('(x-1)^2(x+2)^3');
		expect(directions(result)).toEqual(['increasing', 'increasing', 'decreasing', 'increasing']);
		expect(extremaWithValues(result)).toEqual([
			`local_maximum@-0.200=${(26244 / 3125).toFixed(3)}`,
			'local_minimum@1.000=0.000'
		]);
	});

	it('sur [0 ; 2π] : ↘ puis ↗, minimum global 0 en 1', () => {
		const result = study('(x-1)^2(x+2)^3', DOMAINS['[0 ; 2π]']);
		expect(directions(result)).toEqual(['decreasing', 'increasing']);
		expect(extremaOf(result)).toEqual(['global_maximum@6.283', 'global_minimum@1.000']);
	});
});

describe('domaine fourni hors du domaine de f', () => {
	it('ln x sur [−3 ; −1] : refus « pas définie », jamais une étude sur [−3 ; −1]', () => {
		expect(() => study('\\ln(x)', domainOf('-3', '-1', true, true))).toThrow(
			/n'est pas définie sur l'intervalle/
		);
	});
});

describe('valeurs interdites : écrites comme les points critiques', () => {
	const tanDomain = () => computeDomain(parseLatex('\\tan(x)'), 'x').domain;

	it('tan x ∩ ]0 ; 10[ : points exclus écrits 3π/2, pas 3/2*π', () => {
		const shown = formatInterval(intersect(domainOf('0', '10', false, false), tanDomain()));
		expect(shown).toBe(']0 ; 10[ \\ {π/2 ; 3π/2 ; 5π/2}');
	});

	it('tan x ∩ ]−π/2 ; π/2[ : aucun point exclu sur une borne ouverte', () => {
		const shown = formatInterval(intersect(POLE_DOMAINS[']−π/2 ; π/2[']!, tanDomain()));
		expect(shown).toBe(']-π/2 ; π/2[');
	});

	it('tan x sur [0 ; 2π] : bornes coupées sous forme mise au propre', () => {
		const result = study('\\tan(x)', DOMAINS['[0 ; 2π]']);
		const bounds = result.monotonicIntervals.flatMap((mi) => [
			mi.interval.lower.value,
			mi.interval.upper.value
		]);
		for (const bound of bounds) expect(toLatex(bound)).toBe(toLatex(tidy(bound)));
		expect(bounds.map((b) => toLatex(b))).toContain('\\dfrac{3 \\pi}{2}');
	});

	it("tan x sur ℝ : l'avertissement écrit la condition lisiblement", () => {
		const warning = study('\\tan(x)').warnings?.find((w) => w.includes('intervalle de définition'));
		expect(warning).toContain('π/2 + k·π');
		expect(warning).not.toMatch(/\\pi|\*/);
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
	'x+\\cos(x)+\\cos(x)^2',
	'2\\sin(3x)',
	'\\sin(\\frac{x}{2})',
	'\\sin(x)\\cos(x)+x',
	'-x^4+2x^2',
	'x^4-2x^2',
	'\\frac{1}{x}',
	'\\frac{1}{x^2-1}',
	'\\frac{x^2+1}{x-1}',
	'3\\tan(x)',
	'\\tan(2x)',
	'\\frac{1}{\\cos(x)}',
	'\\frac{1}{\\sin(x)}',
	'\\frac{\\cos(x)}{x^2+1}',
	'\\ln(2+\\sin(x))',
	'(x-1)^2(x+2)^3',
	'x^4+x^3-7x^2-x+6',
	'\\frac{\\cos(x)}{e^x}'
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
	'\\sqrt{x}-2',
	'-x^4+2x^2',
	'x^4-2x^2',
	'\\frac{1}{x}',
	'\\frac{1}{x^2-1}',
	'\\frac{x^2+1}{x-1}',
	'(x-1)^2(x+2)^3',
	'x^4+x^3-7x^2-x+6'
]);

/** Fonctions trigonométriques dont le tableau se conclut sur un domaine BORNÉ. */
const BOUNDED_DOMAINS = [
	'[0 ; 2π]',
	'[−π ; π]',
	'[0 ; 360]',
	'[−10 ; 10]',
	'[0 ; π]',
	'[−3 ; 3]',
	'[−2 ; 3]',
	']−π/2 ; π/2['
];

/**
 * Les domaines où étudier f : ceux de l'échantillon CONTENUS dans son ensemble de
 * définition (un domaine donné qui contient un pôle n'est pas un cas d'élève).
 */
const NATURAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
	'\\tan(x)': ['ℝ', '[0 ; π]', '[−π ; π]', '[0 ; 2π]', ']−π/2 ; π/2[', '[0 ; +∞['],
	'3\\tan(x)': ['ℝ', '[0 ; π]', ']−π/2 ; π/2['],
	'\\tan(2x)': ['ℝ', '[0 ; π]', '[−π ; π]'],
	'\\frac{1}{\\cos(x)}': ['ℝ', '[0 ; 2π]', '[0 ; π]'],
	'\\frac{1}{\\sin(x)}': ['ℝ', '[−π ; π]', ']0 ; +∞[', '[0 ; 2π]', '[−10 ; 10]'],
	// 2 + sin x > 0 : le domaine sur ℝ n'est pas encore déterminé (refus)
	'\\ln(2+\\sin(x))': ['[0 ; 2π]', '[−π ; π]', '[0 ; +∞[', ']0 ; +∞[', '[0 ; 360]', '[−10 ; 10]'],
	'\\frac{1}{x}': ['ℝ', '[−2 ; 3]', '[−10 ; 10]', ']0 ; +∞['],
	'\\frac{1}{x^2-1}': ['ℝ', '[−3 ; 3]', '[0 ; +∞['],
	'\\frac{x^2+1}{x-1}': ['ℝ', '[−2 ; 3]', '[−3 ; 3]'],
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

/**
 * L'ensemble d'étude tel que l'écrit un appelant (`studyDomain`) : le domaine
 * donné, restreint au domaine de définition de f. C'est celui que reçoit le
 * tableau de SIGNES ; le tableau de variations reçoit le domaine brut et doit
 * faire cette restriction lui-même.
 */
function restricted(latex: string, domain: Domain | undefined): Domain | undefined {
	if (domain === undefined) return undefined;
	return normalizeExcludedPoints(intersect(domain, computeDomain(parseLatex(latex), 'x').domain));
}

/** Les intervalles d'un domaine, ℝ pour un domaine non découpé en intervalles. */
function intervalsOf(domain: Domain): readonly Interval[] {
	if (domain.kind === 'interval_set') return domain.intervals;
	return [interval(negInfinityEndpoint(), posInfinityEndpoint())];
}

/** Une valeur numérique d'un nœud sans variable (abscisse ou ordonnée d'un extremum). */
function numeric(node: Parameters<typeof compile>[0]): number {
	return compile(node)({});
}

/** Une valeur interdite de f, ou une borne du domaine d'étude, dans [a ; b] ? */
function forbiddenBetween(study: Domain, a: number, b: number): boolean {
	const inside = (node: Parameters<typeof endpointToNumber>[0]) => {
		const v = endpointToNumber(node);
		return v >= a && v <= b;
	};
	if (study.kind === 'interval_set') {
		return (
			study.intervals.some((int) => inside(int.lower.value) || inside(int.upper.value)) ||
			(study.excludedPoints ?? []).some((p) => inside(p.value))
		);
	}
	if (study.kind === 'periodic_exclusion') {
		const base = endpointToNumber(study.basePoint);
		const period = endpointToNumber(study.period);
		return Math.floor((b - base) / period) >= Math.ceil((a - base) / period);
	}
	return false;
}

/** Les affirmations fausses du tableau de signes et de variations de f sur le domaine. */
function falseClaims(latex: string, domain: Domain | undefined): string[] {
	const f = compile(parseLatex(latex));
	const valuesOn = (int: Interval): number[] =>
		grid(int)
			.map((x) => f({ x }))
			.filter((v) => Number.isFinite(v));
	const problems: string[] = [];

	const signDomain = restricted(latex, domain);
	const sign = analyzeSign(parseLatex(latex), {
		variable: 'x',
		...(signDomain && { domain: signDomain })
	});
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
	if (variations === undefined) return problems;
	const studied = variations.domain;

	for (const mi of variations.monotonicIntervals) {
		if (mi.monotonicity !== 'increasing' && mi.monotonicity !== 'decreasing') continue;
		const points = grid(mi.interval);
		// Une valeur interdite DANS un intervalle de monotonie : le sens est
		// affirmé à travers elle (tan x « croissante sur ℝ »)
		if (points.some((x) => !containsValue(studied, x) || !Number.isFinite(f({ x })))) {
			problems.push(
				`sens ${mi.monotonicity} affirmé à travers une valeur interdite sur ${show(mi.interval)}`
			);
			continue;
		}
		const values = valuesOn(mi.interval);
		const broken = values.some((v, i) => {
			if (i === 0) return false;
			const delta = v - values[i - 1];
			return mi.monotonicity === 'increasing' ? delta < -EPS : delta > EPS;
		});
		if (broken) problems.push(`sens ${mi.monotonicity} faux sur ${show(mi.interval)}`);
	}

	problems.push(...extremaClaims(f, variations));
	return problems;
}

/**
 * Les extrema annoncés : valeur f(x₀), position dans l'ensemble d'étude,
 * nature locale (voisinage) et globale (toute la grille) ; et, quand le
 * tableau se conclut sur un domaine borné, aucun extremum de la grille ne
 * manque.
 */
function extremaClaims(
	f: (scope: Record<string, number>) => number,
	result: VariationResult
): string[] {
	const problems: string[] = [];
	const studied = result.domain;
	const allValues = intervalsOf(studied).flatMap((int) =>
		grid(int)
			.filter((x) => containsValue(studied, x))
			.map((x) => f({ x }))
			.filter((v) => Number.isFinite(v))
	);
	const tol = (y: number) => 1e-7 * (1 + Math.abs(y));

	for (const ext of result.extrema) {
		const x = numeric(ext.x);
		const y = numeric(ext.y);
		const isMin = ext.type === 'local_minimum' || ext.type === 'global_minimum';
		const label = `${ext.type} en ${x.toFixed(3)}`;
		if (!containsValue(studied, x)) {
			problems.push(`${label} hors de l'ensemble d'étude`);
			continue;
		}
		if (!(Math.abs(f({ x }) - y) <= tol(y))) problems.push(`${label} : valeur ${y} ≠ f(x₀)`);
		for (const h of [1e-3, 1e-2]) {
			for (const n of [x - h, x + h]) {
				if (!containsValue(studied, n)) continue;
				const v = f({ x: n });
				if (!Number.isFinite(v)) continue;
				if (isMin ? v < y - tol(y) : v > y + tol(y))
					problems.push(`${label} : pas un extremum local`);
			}
		}
		if (ext.type === 'global_minimum' || ext.type === 'global_maximum') {
			const beaten = allValues.some((v) => (isMin ? v < y - tol(y) : v > y + tol(y)));
			if (beaten) problems.push(`${label} : pas un extremum global`);
		}
	}

	// Aucun extremum manquant : seulement quand le tableau se conclut, sur un
	// domaine borné (la grille le couvre en entier)
	const concluded =
		!result.derivativeZerosUnresolved &&
		result.monotonicIntervals.length > 0 &&
		result.monotonicIntervals.every((mi) => mi.monotonicity !== 'unknown');
	const bounded =
		studied.kind === 'interval_set' &&
		studied.intervals.every(
			(int) =>
				Number.isFinite(endpointToNumber(int.lower.value)) &&
				Number.isFinite(endpointToNumber(int.upper.value))
		);
	if (!concluded || !bounded) return problems;

	const announced = result.extrema.map((e) => ({
		x: numeric(e.x),
		min: e.type === 'local_minimum' || e.type === 'global_minimum'
	}));
	for (const int of intervalsOf(studied)) {
		const xs = grid(int);
		const step = xs.length > 1 ? xs[1] - xs[0] : 0;
		const vs = xs.map((x) => f({ x }));
		for (let i = 1; i < xs.length - 1; i++) {
			const [a, v, b] = [vs[i - 1], vs[i], vs[i + 1]];
			if (![a, v, b].every(Number.isFinite)) continue;
			if (forbiddenBetween(studied, xs[i - 1], xs[i + 1])) continue;
			const isMin = v < a - EPS && v <= b;
			const isMax = v > a + EPS && v >= b;
			if (!isMin && !isMax) continue;
			const found = announced.some((e) => e.min === isMin && Math.abs(e.x - xs[i]) <= 2 * step);
			if (!found)
				problems.push(`${isMin ? 'minimum' : 'maximum'} manquant vers ${xs[i].toFixed(3)}`);
		}
	}
	return problems;
}

function show(int: Interval): string {
	return `]${endpointToNumber(int.lower.value).toFixed(3)} ; ${endpointToNumber(int.upper.value).toFixed(3)}[`;
}

// 30 s par cas et non 5 s (défaut), pour les trois blocs de l'oracle : sur [0 ; 360], `2 sin(3x)` a plusieurs centaines
// de points critiques, et l'oracle en vérifie chacun sur une grille fine — 6,4 s
// mesurées sur la CI (0,8 s pour le moteur seul en local), sans rien de faux
const ORACLE_TIMEOUT_MS = 30_000;

describe('oracle : ce que le tableau affirme est vrai', { timeout: ORACLE_TIMEOUT_MS }, () => {
	for (const latex of EXPRESSIONS) {
		for (const name of domainsFor(latex)) {
			it(`${latex} sur ${name}`, () => {
				expect(falseClaims(latex, domainNamed(name))).toEqual([]);
			});
		}
	}
});

describe('oracle : ce qui se démontre se conclut', { timeout: ORACLE_TIMEOUT_MS }, () => {
	for (const latex of EXPRESSIONS) {
		for (const name of domainsFor(latex)) {
			const mustConclude = NON_PERIODIC.has(latex) || BOUNDED_DOMAINS.includes(name);
			if (!mustConclude) continue;
			it(`${latex} sur ${name} : aucun signe inconnu`, () => {
				const domain = restricted(latex, domainNamed(name));
				const sign = analyzeSign(parseLatex(latex), { variable: 'x', ...(domain && { domain }) });
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

describe('oracle : un sens qui se démontre se conclut', { timeout: ORACLE_TIMEOUT_MS }, () => {
	for (const latex of EXPRESSIONS) {
		for (const name of domainsFor(latex)) {
			const mustConclude = NON_PERIODIC.has(latex) || BOUNDED_DOMAINS.includes(name);
			if (!mustConclude) continue;
			it(`${latex} sur ${name} : aucun sens inconnu`, () => {
				let result: VariationResult;
				try {
					result = study(latex, domainNamed(name));
				} catch (err) {
					// |x − 3| : dérivée non calculée, l'étude refuse
					expect(err).toBeInstanceOf(Error);
					return;
				}
				// f′(x) = 0 non résolue : aucun sens affirmé
				if (result.derivativeZerosUnresolved) {
					expect(result.monotonicIntervals).toEqual([]);
					return;
				}
				expect(
					result.monotonicIntervals
						.filter((mi) => mi.monotonicity === 'unknown')
						.map((mi) => show(mi.interval))
				).toEqual([]);
			});
		}
	}
});
