/**
 * Vitrine — la série de `/demo/questions` (PR 6g)
 *
 * - 4 questions, chacune avec une case et sa réponse attendue ;
 * - la première révision d'une carte neuve s'éloigne avec la note : Encore < Difficile < Bien < Facile.
 */
import { describe, it, expect } from 'vitest';
import { demoClassroomItems, demoInstances, firstReviewIntervals } from '../questions';

describe('série de /demo/questions', () => {
	it('compte 4 questions, chacune avec une réponse attendue', () => {
		const instances = demoInstances();

		expect(instances).toHaveLength(4);
		expect(instances.map((instance) => instance.blanks?.[0]?.expectedAnswer)).toEqual([
			'56',
			'20',
			'9',
			'4'
		]);
		expect(demoClassroomItems().every((item) => item.delaySeconds > 0)).toBe(true);
	});

	it('éloigne la première révision avec la note', () => {
		const [again, hard, good, easy] = firstReviewIntervals();

		expect(again).toBeGreaterThanOrEqual(1);
		expect(again).toBeLessThan(hard);
		expect(hard).toBeLessThan(good);
		expect(good).toBeLessThan(easy);
	});
});
