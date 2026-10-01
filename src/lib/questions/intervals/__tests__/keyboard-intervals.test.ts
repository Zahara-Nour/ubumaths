/**
 * Onglet « Intervalles » du clavier virtuel : les touches attendues, et chaque
 * insertion relue par la correction (aller-retour touche → jugement).
 */

import { describe, it, expect } from 'vitest';
import type { VirtualKeyboardKeycap } from 'mathlive';
import { buildIntervalsKeyboardLayout, INTERVALS_LAYOUT_ID } from '../keyboard-intervals';
import { judgeIntervalAnswer } from '../interval-answer';

function keycaps(): Partial<VirtualKeyboardKeycap>[] {
	const layout = buildIntervalsKeyboardLayout();
	const rows = 'rows' in layout ? layout.rows : [];
	return rows
		.flat()
		.filter((key): key is Partial<VirtualKeyboardKeycap> => typeof key !== 'string');
}

/** Insertion d'une touche, sans le marqueur de curseur #0 */
function insertOf(label: string): string {
	const key = keycaps().find((candidate) => candidate.latex === label);
	if (!key?.insert) throw new Error(`touche absente : ${label}`);
	return key.insert.replace('#0', '');
}

describe('onglet « Intervalles »', () => {
	it('identifiant et libellé', () => {
		const layout = buildIntervalsKeyboardLayout();
		expect(layout.id).toBe(INTERVALS_LAYOUT_ID);
		expect(layout.label).toBe('Intervalles');
	});

	it('les touches demandées, dans l’ordre', () => {
		expect(keycaps().map((key) => key.latex)).toEqual([
			']',
			'[',
			';',
			'+\\infty',
			'-\\infty',
			'\\cup',
			'\\emptyset',
			'\\mathbb{R}',
			'\\setminus\\{\\}'
		]);
	});

	it('une réunion tapée au clavier est relue par la correction', () => {
		const answer = [
			insertOf(']'),
			insertOf('-\\infty'),
			insertOf(';'),
			'-2',
			insertOf('['),
			insertOf('\\cup'),
			insertOf(']'),
			'3',
			insertOf(';'),
			insertOf('+\\infty'),
			insertOf('[')
		].join('');
		expect(judgeIntervalAnswer(answer, ']-\\infty;-2[\\cup]3;+\\infty[').status).toBe('correct');
	});

	it('ℝ privé d’un point et ensemble vide', () => {
		const minusPoint =
			insertOf('\\mathbb{R}') + insertOf('\\setminus\\{\\}').replace('\\}', '2\\}');
		expect(judgeIntervalAnswer(minusPoint, ']-\\infty;2[\\cup]2;+\\infty[').status).toBe('correct');
		expect(judgeIntervalAnswer(insertOf('\\emptyset'), '\\emptyset').status).toBe('correct');
	});
});
