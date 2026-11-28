import { describe, expect, it } from 'vitest';

import { parseTortueContent } from '../../parser/tortue-parser';
import {
	expectedTortueAnswer,
	readExpectedTortueAnswer,
	tortueAnswerVerdict
} from '../../utils/tortue-answer';

// `niveau:` du bloc ```tortue (chantier `tortue-variables`, phase 0 validée le 2026-11-16).

const HEXAGONE = 'mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]';

const CARRE = 'répéter 4 [ avancer 3 ; tourner à droite 90 ]';

function bloc(...lignes: string[]) {
	return parseTortueContent(lignes.join('\n'));
}

describe('parseTortueContent — niveau:', () => {
	it('absent : niveau de base, rien ne change', () => {
		const node = bloc(`attendu: ${CARRE}`);
		expect(node.errors).toEqual([]);
		expect(node.spec?.niveau).toBe('base');
	});

	it('4e, 3e lus, avant ou après attendu:', () => {
		expect(bloc(`attendu: ${HEXAGONE}`, 'niveau: 4e').spec?.niveau).toBe('4e');
		expect(bloc('niveau: 3E', `attendu: ${HEXAGONE}`).spec?.niveau).toBe('3e');
	});

	it('niveau inconnu : refusé', () => {
		const node = bloc(`attendu: ${CARRE}`, 'niveau: 5e');
		expect(node.spec).toBeNull();
		expect(node.errors[0].message).toMatch(/Ligne 2 : niveau: « 5e » : 4e ou 3e/);
	});

	it('attendu: au-dessus du niveau : le niveau à demander', () => {
		const sans = bloc(`attendu: ${HEXAGONE}`);
		expect(sans.spec).toBeNull();
		expect(sans.errors[0].message).toMatch(/Ligne 1 : attendu: .*niveau: 4e/);
		const en4e = bloc('attendu: si 1 = 1 alors [ avancer 2 ]', 'niveau: 4e');
		expect(en4e.errors[0].message).toMatch(/attendu: .*niveau: 3e/);
	});

	it('départ: lu et vérifié au niveau', () => {
		const node = bloc(`attendu: ${HEXAGONE}`, 'départ: mettre n à 3', 'niveau: 4e');
		expect(node.errors).toEqual([]);
		expect(node.spec?.depart).toBe('mettre n à 3');
		const trop = bloc(`attendu: ${HEXAGONE}`, 'départ: si 1 = 1 alors [ ]', 'niveau: 4e');
		expect(trop.errors[0].message).toMatch(/Ligne 2 : départ: .*niveau: 3e/);
	});

	it('départ: une variable lue jamais mise est admise (« complète le programme »)', () => {
		const node = bloc(
			`attendu: ${HEXAGONE}`,
			'départ: répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]',
			'niveau: 4e'
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.depart).toBe('répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]');
	});

	it('variable lue mais jamais mise : faute de frappe signalée', () => {
		const node = bloc('attendu: mettre n à 6 ; répéter m [ avancer 3 ]', 'niveau: 4e');
		expect(node.errors[0].message).toMatch(/« m » est lue mais jamais mise/);
	});

	it('sans niveau : une variable dit le niveau à demander, pas « jamais mise »', () => {
		const node = bloc('attendu: avancer trois');
		expect(node.errors[0].message).toMatch(/« trois » est une variable : un bloc de 4e/);
	});

	it('erreurs dans l’ordre des lignes', () => {
		const node = bloc('attendu: avancer x', 'blocs: 0', 'comparer: bof');
		expect(node.errors.map((e) => e.line)).toEqual([1, 2, 3]);
	});

	it('division par 0 dans attendu: : refusé', () => {
		const node = bloc('attendu: mettre n à 0 ; avancer 3 ÷ n', 'niveau: 4e');
		expect(node.errors[0].message).toMatch(/attendu: .*diviser par 0/);
	});

	it('blocs: compte les instructions au niveau', () => {
		expect(bloc(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'blocs: 4').spec?.blocsMax).toBe(4);
		const trop = bloc(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'blocs: 3');
		expect(trop.errors[0].message).toMatch(/attendu: utilise 4 blocs, plus que blocs: 3/);
	});
});

describe('réponse attendue avec niveau', () => {
	it('sans niveau : forme d’avant', () => {
		expect(expectedTortueAnswer('position', CARRE, null)).toBe(`position | ${CARRE}`);
		expect(readExpectedTortueAnswer(`forme | blocs 3 | ${CARRE}`)).toEqual({
			comparer: 'forme',
			attendu: CARRE,
			blocsMax: 3,
			niveau: 'base'
		});
	});

	it('avec niveau : en tête, relu', () => {
		const attendue = expectedTortueAnswer('position', HEXAGONE, 4, '4e');
		expect(attendue).toBe(`4e | position | blocs 4 | ${HEXAGONE}`);
		expect(readExpectedTortueAnswer(attendue)).toEqual({
			comparer: 'position',
			attendu: HEXAGONE,
			blocsMax: 4,
			niveau: '4e'
		});
	});

	it('verdict au niveau de la réponse attendue', () => {
		const attendue = expectedTortueAnswer('position', HEXAGONE, null, '4e');
		expect(tortueAnswerVerdict(HEXAGONE, attendue)).toEqual({ juste: true });
		expect(tortueAnswerVerdict('si 1 = 1 alors [ avancer 3 ]', attendue).juste).toBe(false);
		const en3e = expectedTortueAnswer('position', 'avancer 3', null, '3e');
		expect(tortueAnswerVerdict('si 1 = 1 alors [ avancer 3 ]', en3e)).toEqual({ juste: true });
	});
});
