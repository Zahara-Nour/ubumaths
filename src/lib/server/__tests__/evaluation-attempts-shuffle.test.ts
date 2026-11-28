/**
 * V72 : « Mélanger l'ordre des questions » d'un contrôle. Case cochée → chaque
 * tentative reçoit les questions dans un ordre tiré au hasard ; case décochée →
 * l'ordre de la série. La reprise relit l'ordre rangé (positions), donc le
 * même ordre.
 */
import { describe, it, expect } from 'vitest';
import { attemptOrder } from '../evaluation-attempts';

// Hasard déterministe : rend les valeurs de la liste, une par appel
function fixedRandom(values: number[]): (max: number) => number {
	let i = 0;
	return (max) => {
		const v = values[i++] ?? 0;
		if (v > max) throw new Error(`tirage ${v} > ${max}`);
		return v;
	};
}

describe('V72 — ordre des questions d’une tentative', () => {
	it('case décochée : l’ordre de la série, sans tirage', () => {
		const random = () => {
			throw new Error('aucun tirage attendu');
		};
		expect(attemptOrder(['q1', 'q2', 'q3'], false, random)).toEqual(['q1', 'q2', 'q3']);
	});

	it('case cochée : l’ordre suit le tirage (Fisher-Yates)', () => {
		// i = 2 : échange avec 0 → q3 q2 q1 ; i = 1 : échange avec 0 → q2 q3 q1
		expect(attemptOrder(['q1', 'q2', 'q3'], true, fixedRandom([0, 0]))).toEqual(['q2', 'q3', 'q1']);
	});

	it('case cochée : garde toutes les questions, une fois chacune', () => {
		const order = attemptOrder(['a', 'b', 'c', 'd', 'e'], true, fixedRandom([3, 1, 2, 0]));
		expect([...order].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('ne modifie pas la liste reçue', () => {
		const items = ['q1', 'q2', 'q3'];
		attemptOrder(items, true, fixedRandom([0, 0]));
		expect(items).toEqual(['q1', 'q2', 'q3']);
	});
});
