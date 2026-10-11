import { describe, expect, it } from 'vitest';
import { normalizeText } from '../alphabet';
import { atbash } from '../atbash';
import { randomText, seededRandom } from './helpers';

describe('Atbash', () => {
	it('A ↔ Z, B ↔ Y : UBU → FYF', () => {
		expect(atbash('UBU').text).toBe('FYF');
		expect(atbash('AZ').text).toBe('ZA');
	});

	it('est sa propre réciproque, pour 300 cas tirés', () => {
		const rand = seededRandom(7);
		for (let i = 0; i < 300; i++) {
			const text = randomText(rand);
			expect(atbash(atbash(text).text).text).toBe(normalizeText(text));
		}
	});

	it('étape : H → 25 − 7 = 18 → S', () => {
		expect(atbash('H').steps[0]).toEqual({ input: 'H', output: 'S', detail: '25 − 7 = 18' });
	});
});
