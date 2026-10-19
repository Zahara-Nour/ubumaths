/**
 * Lecture graphique de l'image : quelles lignes de la console se lisent sur
 * le graphe (lot 3 bis de `docs/archive/wip/atelier-refonte-interface-phase0.md`).
 */
import { describe, expect, it } from 'vitest';
import { consoleReadings, readingCallOf, MAX_READINGS } from '$lib/atelier/reading';

const NAMES = ['f', 'g', "f'"];

/** Une ligne de console réussie, comme `#push` la range. */
function line(label: string, failed = false) {
	return {
		label,
		failed,
		result: failed
			? ({ kind: 'refus', message: 'non' } as const)
			: ({ kind: 'calcul', input: label, output: '0' } as const)
	};
}

describe('readingCallOf : une ligne `f(a)` se lit sur le graphe', () => {
	it('f(3) se lit en x = 3', () => {
		expect(readingCallOf('f(3)', NAMES)).toEqual({ name: 'f', at: 3 });
	});

	it('un argument calculé sans variable se lit aussi (−1/2, √2, π)', () => {
		expect(readingCallOf('f(-1/2)', NAMES)).toEqual({ name: 'f', at: -0.5 });
		expect(readingCallOf('f(sqrt(2))', NAMES)?.at).toBeCloseTo(Math.SQRT2);
		expect(readingCallOf('g(π)', NAMES)?.at).toBeCloseTo(Math.PI);
	});

	it("f'(2) se lit sur la carte de la dérivée", () => {
		expect(readingCallOf("f'(2)", NAMES)).toEqual({ name: "f'", at: 2 });
	});

	it('rien à lire : un calcul autour de f(2), une variable, une fonction inconnue', () => {
		expect(readingCallOf('g(2)+1', NAMES)).toBeNull();
		expect(readingCallOf('f(a)', NAMES)).toBeNull();
		expect(readingCallOf('f(x)', NAMES)).toBeNull();
		expect(readingCallOf('h(2)', NAMES)).toBeNull();
		expect(readingCallOf('3+4', NAMES)).toBeNull();
		expect(readingCallOf('', NAMES)).toBeNull();
	});

	it('f⁻¹(5) ne se lit pas sur f : c’est une image de la réciproque (revue de #1497)', () => {
		expect(readingCallOf('f^{-1}(5)', NAMES)).toBeNull();
	});

	it('une composée f(g(2)) ne se lit pas', () => {
		expect(readingCallOf('f(g(2))', NAMES)).toBeNull();
	});
});

describe('consoleReadings : les dernières lectures de chaque courbe', () => {
	it('garde les lectures réussies, dans l’ordre où elles ont été faites', () => {
		const readings = consoleReadings([line('f(1)'), line('g(2)'), line('f(3)')], NAMES);
		expect(readings.get('f')).toEqual([1, 3]);
		expect(readings.get('g')).toEqual([2]);
	});

	it(`n'en garde que les ${MAX_READINGS} dernières par courbe`, () => {
		const readings = consoleReadings(
			[line('f(1)'), line('f(2)'), line('f(3)'), line('f(4)')],
			NAMES
		);
		expect(MAX_READINGS).toBe(3);
		expect(readings.get('f')).toEqual([2, 3, 4]);
	});

	it('un calcul refusé ne dessine rien', () => {
		expect(consoleReadings([line('f(5)', true)], NAMES).get('f')).toBeUndefined();
	});

	it('la même abscisse lue deux fois ne compte qu’une fois (la plus récente)', () => {
		const readings = consoleReadings([line('f(1)'), line('f(2)'), line('f(1)')], NAMES);
		expect(readings.get('f')).toEqual([2, 1]);
	});
});
