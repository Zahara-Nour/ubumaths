/**
 * Du calcul de variations au tableau que l'application sait dessiner.
 *
 * ⚠️ **Le tableau de variations ne s'affichait pas.** L'action « Variations »
 * de l'atelier rendait le bloc texte du terminal — « Derivee »,
 * « decroissante », « Signe de f'(x) » alignés à l'espace, sans un accent —
 * alors que `VariationTable.svelte` dessine exactement ce tableau, flèches
 * comprises.
 *
 * Les signes et les valeurs ne sont PAS recalculés ici : ils viennent de
 * `computeVariations`.
 */

import { describe, it, expect } from 'vitest';
import { variationTableNode } from '../variation-table';
import { computeVariations } from '$lib/mathAST/variations';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import type { MathNode } from '$lib/mathAST/types';
import type { SignRow, VariationRow } from '$lib/ubumark/types/variation-table';

function ast(source: string): MathNode {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);
	return parsed.ast;
}

function tableOf(source: string) {
	return variationTableNode(computeVariations(ast(source), { variable: 'x' }));
}

function rows(source: string) {
	const node = tableOf(source);
	if (node === null) throw new Error(`repli inattendu sur ${source}`);
	return {
		signe: node.rows.find((r): r is SignRow => r.type === 'sign')!,
		variation: node.rows.find((r): r is VariationRow => r.type === 'variation')!
	};
}

describe('une parabole', () => {
	it('le domaine va de -∞ à +∞ en passant par le point critique', () => {
		const node = tableOf('x^2-3x+2')!;

		expect(node.variable).toBe('x');
		expect(node.domain.map((p) => p.expression)).toEqual(['-\\infty', '\\dfrac{3}{2}', '+\\infty']);
	});

	it('deux lignes : le signe de f’ et les variations de f', () => {
		const node = tableOf('x^2-3x+2')!;

		expect(node.rows.map((r) => r.type)).toEqual(['sign', 'variation']);
		expect((node.rows[0] as SignRow).label).toBe("f'(x)");
		expect((node.rows[1] as VariationRow).label).toBe('f(x)');
	});

	it('le signe de la dérivée suit les intervalles calculés', () => {
		const { signe } = rows('x^2-3x+2');

		expect(signe.values.get('-\\infty,\\dfrac{3}{2}')).toEqual({ type: 'sign', value: '-' });
		expect(signe.values.get('\\dfrac{3}{2},+\\infty')).toEqual({ type: 'sign', value: '+' });
		// ⚠️ L'intervalle dégénéré `[3/2 ; 3/2]` que `variations` émet entre les
		// deux branches n'est PAS un intervalle : il devient le zéro du point.
		expect(signe.values.get('\\dfrac{3}{2}')).toEqual({ type: 'marker', marker: 'zero' });
	});

	it('les variations partent d’en haut, passent par le minimum, remontent', () => {
		const { variation } = rows('x^2-3x+2');

		expect(variation.values.get('-\\infty')).toMatchObject({ position: 'top' });
		expect(variation.values.get('\\dfrac{3}{2}')).toMatchObject({
			expression: '-\\dfrac{1}{4}',
			position: 'bottom'
		});
		expect(variation.values.get('+\\infty')).toMatchObject({ position: 'top' });
	});

	it('les bornes portent la limite, pas le nom de l’infini', () => {
		const { variation } = rows('x^2-3x+2');

		expect(variation.values.get('-\\infty')?.expression).toBe('+\\infty');
		expect(variation.values.get('+\\infty')?.expression).toBe('+\\infty');
	});
});

describe('une cubique à deux extrema', () => {
	it('maximum puis minimum, dans l’ordre', () => {
		const { variation } = rows('x^3-3x');

		expect(variation.values.get('-1')).toMatchObject({ expression: '2', position: 'top' });
		expect(variation.values.get('1')).toMatchObject({ expression: '-2', position: 'bottom' });
	});

	it('la dérivée change de signe deux fois', () => {
		const { signe } = rows('x^3-3x');

		expect(signe.values.get('-\\infty,-1')).toEqual({ type: 'sign', value: '+' });
		expect(signe.values.get('-1,1')).toEqual({ type: 'sign', value: '-' });
		expect(signe.values.get('1,+\\infty')).toEqual({ type: 'sign', value: '+' });
	});

	it('les bornes suivent le sens de la cubique', () => {
		const { variation } = rows('x^3-3x');

		expect(variation.values.get('-\\infty')).toMatchObject({
			expression: '-\\infty',
			position: 'bottom'
		});
		expect(variation.values.get('+\\infty')).toMatchObject({
			expression: '+\\infty',
			position: 'top'
		});
	});
});

describe('valeurs interdites : la double barre et les limites de part et d’autre', () => {
	/**
	 * Jusqu'au 2026-10-09, tout domaine autre que ℝ se repliait sur le bloc
	 * texte — qui, lui, annonçait `1/(2x-1)` décroissante sur ℝ. Le moteur
	 * coupe désormais l'étude aux valeurs interdites, et le tableau les dessine.
	 */
	it('1/(2x-1) : −∞, 1/2 (double barre), +∞', () => {
		const node = tableOf('1/(2x-1)');
		expect(node?.domain.map((p) => p.expression)).toEqual([
			'-\\infty',
			'\\dfrac{1}{2}',
			'+\\infty'
		]);
		const { signe, variation } = rows('1/(2x-1)');
		expect(signe.values.get('-\\infty,\\dfrac{1}{2}')).toEqual({ type: 'sign', value: '-' });
		expect(signe.values.get('\\dfrac{1}{2}')).toEqual({ type: 'marker', marker: 'asymptote' });
		expect(signe.values.get('\\dfrac{1}{2},+\\infty')).toEqual({ type: 'sign', value: '-' });
		expect(variation.values.get('\\dfrac{1}{2}')).toMatchObject({
			marker: 'asymptote',
			limits: [
				{ expression: '-\\infty', position: 'bottom' },
				{ expression: '+\\infty', position: 'top' }
			]
		});
		expect(variation.values.get('-\\infty')).toMatchObject({ expression: '0', position: 'top' });
		expect(variation.values.get('+\\infty')).toMatchObject({ expression: '0', position: 'bottom' });
	});

	it('x + 1/x : maximum en −1, double barre en 0, minimum en 1', () => {
		const node = tableOf('x+1/x');
		expect(node?.domain.map((p) => p.expression)).toEqual(['-\\infty', '-1', '0', '1', '+\\infty']);
		const { signe, variation } = rows('x+1/x');
		expect(signe.values.get('-1')).toEqual({ type: 'marker', marker: 'zero' });
		expect(signe.values.get('0')).toEqual({ type: 'marker', marker: 'asymptote' });
		expect(variation.values.get('-1')).toMatchObject({ expression: '-2', position: 'top' });
		expect(variation.values.get('1')).toMatchObject({ expression: '2', position: 'bottom' });
		expect(variation.values.get('0')).toMatchObject({
			limits: [
				{ expression: '-\\infty', position: 'bottom' },
				{ expression: '+\\infty', position: 'top' }
			]
		});
	});

	it('ln(x)/x : de 0 (exclu) à +∞, maximum en e', () => {
		const node = tableOf('ln(x)/x');
		expect(node?.domain).toEqual([
			{ expression: '0', open: true },
			{ expression: '\\exponentialE' },
			{ expression: '+\\infty' }
		]);
		const { variation } = rows('ln(x)/x');
		expect(variation.values.get('0')).toMatchObject({ expression: '-\\infty', position: 'bottom' });
		expect(variation.values.get('+\\infty')).toMatchObject({ expression: '0', position: 'bottom' });
	});

	it('1/(x²−1) : deux doubles barres, croissante puis décroissante', () => {
		const node = tableOf('1/(x^2-1)');
		expect(node?.domain.map((p) => p.expression)).toEqual(['-\\infty', '-1', '0', '1', '+\\infty']);
	});

	it('un domaine troué (√(x²−1)) se replie encore', () => {
		expect(tableOf('sqrt(x^2-1)')).toBeNull();
	});
});

describe('Terminale : exponentielle', () => {
	// Mesuré avant : `null` pour x eˣ — les limites en ±∞ sortaient
	// « indetermine », le moteur de limites ne lisant pas `e^u`.
	it('x eˣ : un tableau, de 0 à +∞ en passant par le minimum −1/e', () => {
		const { variation } = rows('x e^x');

		expect(variation.values.get('-\\infty')).toMatchObject({ expression: '0', position: 'top' });
		expect(variation.values.get('-1')).toMatchObject({
			expression: '-\\dfrac{1}{\\exponentialE}',
			position: 'bottom'
		});
		expect(variation.values.get('+\\infty')).toMatchObject({
			expression: '+\\infty',
			position: 'top'
		});
	});

	it('e^{−x²} : de 0 à 1 puis à 0', () => {
		const { variation } = rows('e^(-x^2)');

		expect(variation.values.get('-\\infty')?.expression).toBe('0');
		expect(variation.values.get('0')).toMatchObject({ expression: '1', position: 'top' });
		expect(variation.values.get('+\\infty')?.expression).toBe('0');
	});

	it('x e^{2x} : le minimum −1/(2e) en −1/2', () => {
		const { variation } = rows('x e^(2x)');

		expect(variation.values.get('-\\dfrac{1}{2}')).toMatchObject({
			expression: '-\\dfrac{1}{2 \\exponentialE}',
			position: 'bottom'
		});
	});
});
