import { describe, expect, it } from 'vitest';
import { caesarEncrypt } from '../caesar';
import { FRENCH_FREQUENCIES, caesarBruteForce, letterFrequencies } from '../frequency';
import { FRENCH_SENTENCE } from './helpers';

describe('table de référence', () => {
	it('26 lettres, total 100 %', () => {
		const values = Object.values(FRENCH_FREQUENCIES);
		expect(values).toHaveLength(26);
		expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
	});

	it('E est la lettre la plus fréquente', () => {
		const max = Math.max(...Object.values(FRENCH_FREQUENCIES));
		expect(FRENCH_FREQUENCIES.E).toBe(max);
	});
});

describe('letterFrequencies', () => {
	it('compte les lettres normalisées et ignore le reste', () => {
		const { total, letters } = letterFrequencies('Été, 2026 !');
		expect(total).toBe(3);
		expect(letters.find((l) => l.letter === 'E')).toEqual({
			letter: 'E',
			count: 2,
			percent: (2 / 3) * 100
		});
		expect(letters.find((l) => l.letter === 'T')?.count).toBe(1);
		expect(letters).toHaveLength(26);
	});

	it('texte sans lettre : total 0, aucun pourcentage non nul', () => {
		const { total, letters } = letterFrequencies('123 !');
		expect(total).toBe(0);
		expect(letters.every((l) => l.count === 0 && l.percent === 0)).toBe(true);
	});
});

describe('caesarBruteForce', () => {
	it('rend les 26 candidats', () => {
		expect(caesarBruteForce('XEX')).toHaveLength(26);
	});

	it.each([1, 3, 13, 25])(
		'sur une phrase française de plus de 80 lettres, le bon décalage (%i) arrive premier',
		(shift) => {
			const encrypted = caesarEncrypt(FRENCH_SENTENCE, shift).text;
			const [best] = caesarBruteForce(encrypted);
			expect(best.shift).toBe(shift);
			expect(best.text).toBe(caesarEncrypt(FRENCH_SENTENCE, 0).text);
		}
	);

	it('candidats classés du plus au moins français (score croissant)', () => {
		const candidates = caesarBruteForce(caesarEncrypt(FRENCH_SENTENCE, 7).text);
		for (let i = 1; i < candidates.length; i++) {
			expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i - 1].score);
		}
	});

	it('texte sans lettre → aucun candidat', () => {
		expect(caesarBruteForce('2026 !')).toEqual([]);
	});
});
