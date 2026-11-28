/**
 * E15 (2026-11-23) : la légende lue par les lecteurs d'écran disait « Tableau
 * de variations de la fonction x » — la VARIABLE, pas la fonction.
 */

import { describe, expect, it } from 'vitest';
import type { VariationTableNode } from '#lib/ubumark/types/variation-table.ts';
import { variationTableTitle } from '../variation-table-title';

function table(variable: string, ...rows: { type: 'sign' | 'variation'; label: string }[]) {
	return {
		type: 'variation-table',
		variable,
		domain: [],
		rows: rows.map((row) => ({ ...row, values: new Map() }))
	} as unknown as VariationTableNode;
}

describe('variationTableTitle', () => {
	it('nomme la fonction de la ligne de variations', () => {
		expect(variationTableTitle(table('x', { type: 'variation', label: 'f(x)' }))).toBe(
			'Tableau de variations de f'
		);
		expect(
			variationTableTitle(
				table('t', { type: 'sign', label: "g'(t)" }, { type: 'variation', label: 'g(t)' })
			)
		).toBe('Tableau de variations de g');
	});

	it('une étiquette qui n’est pas f(x) est citée telle quelle', () => {
		expect(variationTableTitle(table('x', { type: 'variation', label: 'e^x' }))).toBe(
			'Tableau de variations de e^x'
		);
	});

	it('sans ligne de variations : un tableau de signes', () => {
		expect(variationTableTitle(table('x', { type: 'sign', label: 'f(x)' }))).toBe(
			'Tableau de signes de f'
		);
		expect(variationTableTitle(table('x'))).toBe('Tableau de signes');
	});
});
