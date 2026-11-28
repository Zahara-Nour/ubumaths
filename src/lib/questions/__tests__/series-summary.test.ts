/**
 * Résumé de « Ma série » (PR 4 automaths, phase 0 validée le 2026-11-19) :
 * nombre de questions et durée totale (répétitions × durée par question).
 */
import { describe, it, expect } from 'vitest';
import {
	formatSeriesDuration,
	seriesQuestionCount,
	seriesTotalSeconds
} from '#lib/questions/series-summary.ts';

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

describe('seriesTotalSeconds', () => {
	it('additionne répétitions × durée de chaque question', () => {
		expect(
			seriesTotalSeconds([
				{ templateId: ID_A, quantity: 4, delay: 20 },
				{ templateId: ID_B, quantity: 2, delay: 35 }
			])
		).toBe(150);
	});

	it('durée 0 = durée par défaut (20 s)', () => {
		expect(seriesTotalSeconds([{ templateId: ID_A, quantity: 3, delay: 0 }])).toBe(60);
	});

	it('série vide : 0', () => {
		expect(seriesTotalSeconds([])).toBe(0);
	});
});

describe('formatSeriesDuration', () => {
	it('moins d’une minute : en secondes', () => {
		expect(formatSeriesDuration(45)).toBe('45 s');
	});

	it('minutes rondes', () => {
		expect(formatSeriesDuration(60)).toBe('1 min');
		expect(formatSeriesDuration(600)).toBe('10 min');
	});

	it('minutes et secondes, secondes sur deux chiffres', () => {
		expect(formatSeriesDuration(150)).toBe('2 min 30');
		expect(formatSeriesDuration(125)).toBe('2 min 05');
	});

	it('une heure et plus : en minutes', () => {
		expect(formatSeriesDuration(3900)).toBe('65 min');
	});
});

describe('seriesQuestionCount', () => {
	it('accorde « question »', () => {
		expect(seriesQuestionCount(0)).toBe('0 question');
		expect(seriesQuestionCount(1)).toBe('1 question');
		expect(seriesQuestionCount(3)).toBe('3 questions');
	});
});
