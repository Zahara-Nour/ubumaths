/**
 * Mathou qui grandit : mesures intermédiaires entre deux stades. Aux deux bouts, le dessin est
 * exactement celui du stade ; la gerbe de confettis est la même à chaque fois.
 */

import { describe, it, expect } from 'vitest';
import { blendStages, celebration, pearGeometry, stageTemplate } from '../mathou-dessin';

describe('blendStages', () => {
	const chaton = stageTemplate('chaton');
	const matou = stageTemplate('matou');

	it('t = 0 : le stade de départ ; t = 1 : le stade d’arrivée (dessin identique)', () => {
		expect(pearGeometry(blendStages(chaton, matou, 0))).toEqual(pearGeometry('chaton'));
		expect(pearGeometry(blendStages(chaton, matou, 1))).toEqual(pearGeometry('matou'));
	});

	it('à mi-chemin : chaque mesure entre les deux', () => {
		const mid = blendStages(chaton, matou, 0.5);
		expect(mid.hw).toBe((chaton.hw + matou.hw) / 2);
		expect(mid.bw).toBe((chaton.bw + matou.bw) / 2);
		expect(mid.youth).toBe(0.5);
		expect(pearGeometry(mid).body).not.toBe(pearGeometry('chaton').body);
	});

	it('chaton : pieds en dedans ; adulte : pieds droits', () => {
		expect(pearGeometry('chaton').feet.map((f) => f.rotate)).toEqual([16, -16]);
		expect(pearGeometry('matou').feet.map((f) => f.rotate)).toEqual([0, 0]);
	});
});

describe('celebration', () => {
	it('déterministe : 16 confettis, 5 étoiles, la couleur de l’auréole parmi les confettis', () => {
		const a = celebration('hsl(1, 2%, 3%)');
		expect(a).toEqual(celebration('hsl(1, 2%, 3%)'));
		expect(a.confetti).toHaveLength(16);
		expect(a.sparkles).toHaveLength(5);
		expect(a.confetti.map((c) => c.color)).toContain('hsl(1, 2%, 3%)');
	});
});
