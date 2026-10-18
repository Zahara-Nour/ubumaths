/**
 * Limites des listes de l'atelier laissées par Q45/Q46 (Q48-Q51, 2026-10-02).
 *
 * - Q48 : la partenaire choisie suivait mal un renommage (retour silencieux à
 *   celle par défaut) ;
 * - Q49 : `1/2,3/4` était écarté sans le message des points-virgules ;
 * - Q50 : `+1/6` et le vrai signe moins (−) étaient refusés ;
 * - Q51 : la Loi refusait une valeur sans dire laquelle.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';
import { parseDefinition, readListValue, readNumber } from '../parse';

function atelierWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

// Q48 : la partenaire suivait mal un renommage. Depuis le lot 4a, plus de choix
// retenu : chaque partenaire a ses actions (« Avec une autre liste »), par son nom
describe('Q48 — les actions avec une partenaire suivent son renommage', () => {
	it('renommer N en P : les actions avec P remplacent celles avec N', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '1 ; 2', N: '1 ; 2' });

		atelier.rename('N', 'P');

		const ids = actionsFor(atelier.get('L')!, atelier, 'P').map((a) => a.id);
		expect(ids).toContain('scatter:P');
		expect(ids).not.toContain('scatter:N');
	});

	it('supprimer la partenaire : plus d’action avec elle', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '1 ; 2', N: '1 ; 2' });

		atelier.remove('N');

		const ids = actionsFor(atelier.get('L')!, atelier, 'M').map((a) => a.id);
		expect(ids.some((id) => id.endsWith(':N'))).toBe(false);
	});
});

describe('Q49 — virgules entre fractions', () => {
	it('1/2,3/4 : le message montre la correction', () => {
		expect(parseDefinition('list', '1/2,3/4').error).toBe(
			'Sépare tes valeurs par des points-virgules : 1/2 ; 3/4'
		);
	});

	it('12,15,9 : message inchangé ; 3,14 accepté', () => {
		expect(parseDefinition('list', '12,15,9').error).toBe(
			'Sépare tes valeurs par des points-virgules : 12 ; 15 ; 9'
		);
		expect(parseDefinition('list', '3,14').error).toBeUndefined();
	});

	it('vrai signe moins : −1,−2 et −1/2,3/4 repris, −3,14 accepté (revue)', () => {
		expect(parseDefinition('list', '−1,−2').error).toBe(
			'Sépare tes valeurs par des points-virgules : −1 ; −2'
		);
		expect(parseDefinition('list', '−1/2,3/4').error).toBe(
			'Sépare tes valeurs par des points-virgules : −1/2 ; 3/4'
		);
		expect(parseDefinition('list', '−3,14').error).toBeUndefined();
	});

	it('mélange (1,5/2 ; 1/2,1) : pas de message, la valeur est écartée', () => {
		for (const definition of ['1,5/2', '1/2,1']) {
			const parsed = parseDefinition('list', definition);
			expect(parsed.error, definition).toBeUndefined();
		}
	});
});

describe('Q50 — signes dans une liste', () => {
	it('+1/6, −1/6 (vrai signe moins), −3 et −2,5 sont lus', () => {
		expect(readListValue('+1/6')).toBeCloseTo(1 / 6, 15);
		expect(readListValue('−1/6')).toBeCloseTo(-1 / 6, 15);
		expect(readListValue('−3')).toBe(-3);
		expect(readListValue('−2,5')).toBe(-2.5);
	});

	it('+-1/6, --3 et − seul sont écartés', () => {
		for (const raw of ['+-1/6', '--3', '−', '−−3', '+−1/6']) {
			expect(readListValue(raw), raw).toBeNull();
		}
	});

	it('readNumber, utilisé ailleurs, est inchangé', () => {
		expect(readNumber('−3')).toBeNull();
	});
});

describe('Q51 — la Loi nomme la valeur fautive', () => {
	it('une probabilité sans fraction simple : nommée, à la française', () => {
		const desk = new CalcDesk(atelierWith({ L: '1 ; 2', M: '0,000071 ; 0,999929' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].failed).toBe(true);
		expect(desk.entries[0].text).toBe(
			'0,000071 ne s’écrit pas comme une fraction simple : la loi ne peut pas être calculée exactement.'
		);
	});

	it('une valeur fautive (et non une probabilité) est nommée de même', () => {
		const desk = new CalcDesk(atelierWith({ L: '3,14159265 ; 2', M: '0,5 ; 0,5' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].text).toMatch(/^3,14159265 ne s’écrit pas/);
	});

	it('une fraction saisie est nommée comme l’élève l’a tapée (revue)', () => {
		const desk = new CalcDesk(atelierWith({ L: '1 ; 2', M: '1/10007 ; 10006/10007' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].text).toMatch(/^1\/10007 ne s’écrit pas/);
	});

	it('plusieurs valeurs fautives : la première seulement', () => {
		const desk = new CalcDesk(atelierWith({ L: '1 ; 2 ; 3', M: '0,000071 ; 0,000073 ; 0,999856' }));

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].text).toMatch(/^0,000071 ne s’écrit pas/);
		expect(desk.entries[0].text).not.toContain('0,000073');
	});
});
