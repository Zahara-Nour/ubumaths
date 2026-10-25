/**
 * Forme canonique partagée (`canonicalForm`, `exactRational`,
 * `polynomialCoefficients`) — chantier normalize-usages, lot (b).
 *
 * Non-régression : les extracteurs de coefficients des solveurs, devenus des
 * enveloppes de `coefficientsByDegree`, rendent ce qu'ils rendaient avant le
 * lot (b) (capture du 2026-10-25, écriture reçue ET forme canonique). Seul
 * écart, voulu : la constante c du quadratique est réduite comme a et b
 * (`3x+2-5x+7` lu tel quel : c = 9, et non plus `2 + 7`).
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '../../parser/custom';
import { normalize } from '../normalize';
import { denormalize } from '../denormalize';
import { toLatex } from '../../latex-generator';
import { canonicalForm, exactRational, polynomialCoefficients } from '../canonical-form';
import { extractLinearCoefficients } from '../../solve/solvers/linear';
import { extractQuadraticCoefficients } from '../../solve/solvers/quadratic';
import { extractCubicCoefficients } from '../../solve/solvers/polynomial';
import type { MathNode } from '../../types';
import AVANT from '../../../../../tests/fixtures/mathast/extracteurs-coefficients-2026-10-25.json';

function coefficients(source: string, degree: number): string[] | null {
	const result = polynomialCoefficients(parseCustom(source), 'x', degree);
	return result === null ? null : result.map((c) => toLatex(c));
}

function show(r: Record<string, MathNode> | null): string | null {
	return r === null
		? null
		: Object.entries(r)
				.map(([k, v]) => `${k}=${toLatex(v)}`)
				.join(' ; ');
}

describe('canonicalForm', () => {
	it.each(['2x+3x', '(x+1)^2', 'sqrt(8)', '1/2+1/3', 'a(b+c)'])(
		'%s : la forme de denormalize(normalize())',
		(source) => {
			const node = parseCustom(source);
			expect(toLatex(canonicalForm(node))).toBe(toLatex(denormalize(normalize(node))));
		}
	);
});

describe('exactRational', () => {
	it('lit un rationnel exact', () => {
		expect(exactRational(parseCustom('1/2+1/3'))).toEqual({ n: 5n, d: 6n });
	});
	it('null pour un irrationnel ou une lettre', () => {
		expect(exactRational(parseCustom('sqrt(2)'))).toBeNull();
		expect(exactRational(parseCustom('x+1'))).toBeNull();
	});
});

describe('polynomialCoefficients', () => {
	it('lit les coefficients sur la forme développée', () => {
		expect(coefficients('(x-1)^2', 2)).toEqual(['1', '-2', '1']);
		expect(coefficients('2(x-1)', 1)).toEqual(['-2', '2']);
		expect(coefficients('(x+1)^3', 3)).toEqual(['1', '3', '3', '1']);
	});
	it('degré inférieur : coefficients nuls en tête', () => {
		expect(coefficients('2x+3', 2)).toEqual(['3', '2', '0']);
	});
	it('coefficients exacts et paramètres', () => {
		expect(coefficients('x/2+1/3', 1)).toEqual(['\\dfrac{1}{3}', '\\dfrac{1}{2}']);
		expect(coefficients('ax^2+b', 2)).toEqual(['b', '0', 'a']);
	});
	it('null au-delà du degré ou hors polynôme', () => {
		expect(coefficients('x^3+1', 2)).toBeNull();
		expect(coefficients('sin(x)+1', 1)).toBeNull();
		expect(coefficients('1/x+1', 1)).toBeNull();
	});
});

describe('extracteurs des solveurs : même sortie qu’avant le lot (b)', () => {
	const cases = Object.entries(AVANT as Record<string, Record<string, string | null>>);
	it.each(cases)('%s', (key, expected) => {
		const [source, form] = key.split(' | ');
		const raw = parseCustom(source);
		const node = form === 'canon' ? denormalize(normalize(raw)) : raw;
		expect({
			linear: show(extractLinearCoefficients(node, 'x')),
			quadratic: show(extractQuadraticCoefficients(node, 'x')),
			cubic: show(extractCubicCoefficients(node, 'x'))
		}).toEqual(expected);
	});
});
