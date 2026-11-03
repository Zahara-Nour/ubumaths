/**
 * Résultat attendu à l'écran : tableau de signes à compléter (chantier tableau-signes, PR 4)
 *
 * Le tableau lui-même, chaque cellule cachée corrigée À SA PLACE : juste en vert,
 * fausse barrée avec la bonne valeur dessous, vide avec la bonne valeur en
 * pointillés ; statut en toutes lettres pour un lecteur d'écran.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExpectedResultView from '../ExpectedResultView.svelte';
import type { ExpectedResult, ExpectedSignCell } from '$lib/questions/expected-result';

// Fixtures
const SOURCE = [
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+'
].join('\n');

const cell = (
	index: number,
	cellule: ExpectedSignCell['cellule'],
	expected: string,
	student: string | null,
	status: ExpectedSignCell['status']
): ExpectedSignCell => ({ index, cellule, expected, student, status });

function result(
	cells: ExpectedSignCell[],
	status: 'correct' | 'incorrect' | 'solution'
): ExpectedResult {
	return {
		status: status === 'solution' ? null : status,
		lines: [{ kind: 'sign-table', index: 0, source: SOURCE, cells, status }]
	};
}

async function show(r: ExpectedResult) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(ExpectedResultView, { target: main, props: { result: r } });
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const cellOf = (root: HTMLElement, index: number) =>
	root.querySelector<HTMLElement>(`[data-sign-cell="${index}"]`);

// Tests
describe('SignTableAnswer — dans le résultat attendu', () => {
	it('un signe faux : barré, la bonne valeur dessous ; les autres justes ; « faux »', async () => {
		const { container } = await show(
			result(
				[
					cell(0, 'valeur', '-3', '-3', 'correct'),
					cell(1, 'signe', '+', '-', 'incorrect'),
					cell(2, 'marque', 'z', 'z', 'correct'),
					cell(3, 'signe', '+', '+', 'correct')
				],
				'incorrect'
			)
		);
		// Le tableau est là, quatre cellules corrigées à leur place
		expect(container.querySelector('table.vt-grid')).not.toBeNull();
		expect(container.querySelectorAll('[data-sign-cell]')).toHaveLength(4);

		const faux = cellOf(container, 1);
		expect(faux?.dataset.status).toBe('incorrect');
		expect(text(faux?.querySelector('[data-student]') ?? null)).toBe('−');
		expect(text(faux?.querySelector('[data-expected]') ?? null)).toBe('+');
		expect(text(faux?.querySelector('.sr-only') ?? null)).toBe(
			'Case 2, ta réponse : moins, faux, attendu : plus'
		);

		const juste = cellOf(container, 2);
		expect(text(juste?.querySelector('[data-student]') ?? null)).toBe('0');
		expect(juste?.querySelector('[data-expected]')).toBeNull();
		expect(cellOf(container, 0)?.querySelector('math-span')?.textContent).toBe('-3');

		expect(text(container.querySelector('[data-kind="sign-table"] [data-status-label]'))).toBe(
			'faux'
		);
	});

	it('cellule vide : la bonne valeur, sans réponse d’élève', async () => {
		const { container } = await show(
			result(
				[
					cell(0, 'valeur', '-3', '-3', 'correct'),
					cell(1, 'signe', '+', null, 'empty'),
					cell(2, 'marque', 'z', 'z', 'correct'),
					cell(3, 'signe', '+', '+', 'correct')
				],
				'incorrect'
			)
		);
		const vide = cellOf(container, 1);
		expect(vide?.querySelector('[data-student]')).toBeNull();
		expect(vide?.querySelector('[data-expected].was-empty')).not.toBeNull();
		expect(text(vide?.querySelector('.sr-only') ?? null)).toBe(
			'Case 2, sans réponse, attendu : plus'
		);
	});

	it('sans réponse (R9) : les solutions dans les cellules, aucun verdict', async () => {
		const { container } = await show(
			result(
				[
					cell(0, 'valeur', '-3', null, 'solution'),
					cell(1, 'signe', '+', null, 'solution'),
					cell(2, 'marque', 'z', null, 'solution'),
					cell(3, 'signe', '+', null, 'solution')
				],
				'solution'
			)
		);
		expect([...container.querySelectorAll('[data-expected]')].map((e) => text(e))).toEqual([
			'-3',
			'+',
			'0',
			'+'
		]);
		expect(container.querySelector('[data-status-label]')).toBeNull();
	});

	it('réponse inattendue dans une case signe : texte brut, jamais interprété', async () => {
		const { container } = await show(
			result(
				[
					cell(0, 'valeur', '-3', '-3', 'correct'),
					cell(1, 'signe', '+', '<img src=x onerror=alert(1)>', 'incorrect')
				],
				'incorrect'
			)
		);
		expect(container.querySelector('img')).toBeNull();
		expect(text(cellOf(container, 1)?.querySelector('[data-student]') ?? null)).toContain('img');
	});
});
