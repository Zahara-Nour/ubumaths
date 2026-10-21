/**
 * La nature d'une courbe, lue par la carte (géométrie v2, lot 1, PR 2 — C1,
 * C2, C6 reportés de la PR 1). Recalculée à chaque lecture, jamais rangée :
 * elle suit les valeurs que l'équation cite.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { curveNatureOf, EMPTY_CURVE } from '../curve-nature';

function natureOf(definition: string, values: [string, string][] = []) {
	const atelier = new Atelier();
	for (const [name, value] of values) {
		atelier.create({ kind: 'value', name, definition: value }, 'text');
	}
	atelier.create({ kind: 'curve', name: 'C', definition }, 'text');
	return { atelier, nature: curveNatureOf(atelier, 'C') };
}

describe('la nature d’une courbe de l’atelier', () => {
	it('C1 : d : y = 3x − 2 est une « droite »', () => {
		expect(natureOf('y = 3x - 2').nature).toEqual({ label: 'droite' });
	});

	it('C2 : x² + y² − 1 = 0 et x² + y² = 1 sont un « cercle »', () => {
		expect(natureOf('x^2 + y^2 - 1 = 0').nature).toEqual({ label: 'cercle' });
		expect(natureOf('x^2 + y^2 = 1').nature).toEqual({ label: 'cercle' });
	});

	it('C3 : x = 2 est une « droite »', () => {
		expect(natureOf('x = 2').nature).toEqual({ label: 'droite' });
	});

	it('ellipse, parabole, hyperbole, courbe', () => {
		expect(natureOf('x^2 + 4y^2 = 4').nature?.label).toBe('ellipse');
		expect(natureOf('y = x^2').nature?.label).toBe('parabole');
		expect(natureOf('x y = 1').nature?.label).toBe('hyperbole');
		expect(natureOf('y = sin(x)').nature?.label).toBe('courbe');
	});

	it('C6 : x² + y² = −1 est acceptée, vide, et la carte le constate', () => {
		const { atelier, nature } = natureOf('x^2 + y^2 = -1');

		expect(atelier.get('C')?.status).toBe('ok');
		expect(nature).toEqual({ label: 'courbe', note: EMPTY_CURVE });
		expect(EMPTY_CURVE).toBe('Aucun point ne vérifie cette équation.');
	});

	it('la nature suit la valeur citée : a = 0 rend le cercle x² + y² = a² réduit à un point', () => {
		const { atelier, nature } = natureOf('x^2 + y^2 = a^2', [['a', '2']]);
		expect(nature).toEqual({ label: 'cercle' });

		atelier.slideTo('a', 0);

		expect(curveNatureOf(atelier, 'C')).toEqual({
			label: 'point',
			note: 'Un seul point vérifie cette équation.'
		});
	});

	it('deux droites (x² = 4)', () => {
		expect(natureOf('x^2 = 4').nature?.label).toBe('deux droites');
	});

	it('une courbe en attente ou en erreur n’a pas de nature', () => {
		expect(natureOf('x^2 + y^2 = b^2').nature).toBeNull();
		expect(natureOf('y = 3x +').nature).toBeNull();
	});

	it('la nature n’entre pas dans la sauvegarde', () => {
		const { atelier } = natureOf('y = 3x - 2');

		expect(JSON.stringify(atelier.serialize())).not.toContain('droite');
	});
});
