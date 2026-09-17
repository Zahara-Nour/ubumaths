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

describe('le repli', () => {
	/**
	 * `1/x` déclenche DEUX raisons de se replier à la fois :
	 *
	 * - son domaine n'est pas ℝ, et une asymptote demande des doubles barres et
	 *   des limites de part et d'autre, que cette version ne dessine pas ;
	 * - ⚠️ **défaut mesuré dans `variations`** : il rend QUATRE extrema, tous
	 *   situés en ±∞ et valant `\dfrac{1}{-\infty}`, pour une fonction qui n'en
	 *   a aucun.
	 *
	 * ⚠️ Vérifié par neutralisation : **aucune des deux gardes ne fait rougir ce
	 * test à elle seule** — l'autre rattrape. Il faut les retirer toutes les
	 * deux. C'est de la défense en profondeur, pas deux gardes prouvées ; noté
	 * ici pour que personne ne croie ce test plus fort qu'il n'est.
	 */
	it('une fonction à asymptote se replie', () => {
		expect(tableOf('1/x')).toBeNull();
	});
});
