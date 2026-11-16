import { describe, expect, it } from 'vitest';

import { parseCalculContent } from '../../parser/calcul-parser';
import {
	calculAnswerVerdict,
	expectedCalculAnswer,
	readExpectedCalculAnswer
} from '../../utils/calcul-answer';

// Clé `niveau:` du bloc ```calcul (piste 4e / 3e, phase 0 validée le 2026-11-16).

const NOMINAL = 'mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]';

function messages(source: string): string {
	return parseCalculContent(source)
		.errors.map((e) => e.message)
		.join(' | ');
}

describe('niveau:', () => {
	it('absent : 5e', () => {
		expect(parseCalculContent('attendu: afficher nombre').spec?.niveau).toBe('5e');
	});

	it('4e et 3e lus', () => {
		const node = parseCalculContent(`niveau: 4e\nattendu: ${NOMINAL}`);
		expect(node.errors).toEqual([]);
		expect(node.spec?.niveau).toBe('4e');
		expect(parseCalculContent(`attendu: ${NOMINAL}\nniveau: 3e`).spec?.niveau).toBe('3e');
	});

	it('autre valeur refusée', () => {
		expect(messages('niveau: 6e\nattendu: afficher nombre')).toMatch(
			/Ligne 1 : niveau: « 6e » : 5e, 4e ou 3e/
		);
	});

	it('attendu au-dessus du niveau : refusé, le niveau nécessaire nommé', () => {
		expect(messages(`attendu: ${NOMINAL}`)).toMatch(
			/attendu: « mettre … à » est un bloc de 4e \(ajouter niveau: 4e\)/
		);
		expect(
			messages(
				'niveau: 4e\nattendu: si nombre > 0 et nombre < 3 alors [ afficher 1 ] sinon [ afficher 0 ]'
			)
		).toMatch(/« et » est un bloc de 3e \(ajouter niveau: 3e\)/);
	});

	it('variable lue jamais mise (faute de frappe) : refusée, sans proposer de monter de niveau (revue #2716)', () => {
		expect(messages('niveau: 4e\nattendu: afficher nombr + 2')).toMatch(
			/attendu: « nombr » est lue mais jamais mise \(faute de frappe \?\)/
		);
		expect(
			messages('niveau: 4e\nattendu: mettre prix à nombre × 3 ; afficher pirx + nombre')
		).toMatch(/« pirx » est lue mais jamais mise/);
		const cinquieme = messages('attendu: afficher nombr + 2');
		expect(cinquieme).toMatch(/« nombr » est lue mais jamais mise/);
		expect(cinquieme).not.toMatch(/niveau: 4e/);
		expect(messages('attendu: afficher nombre\ndépart: afficher nombr')).toMatch(
			/départ: « nombr » est lue mais jamais mise/
		);
		// Mise par « ajouter … à » : elle compte comme mise
		expect(messages('niveau: 4e\nattendu: ajouter nombre à n ; afficher n')).toBe('');
	});

	it('départ au-dessus du niveau : refusé aussi', () => {
		expect(messages('attendu: afficher nombre\ndépart: mettre x à 1')).toMatch(
			/départ: « mettre … à » est un bloc de 4e/
		);
	});

	it('une branche jamais parcourue sur les essais : refusé, avec la condition', () => {
		expect(
			messages('niveau: 4e\nattendu: si nombre > 100 alors [ afficher 1 ] sinon [ afficher 2 ]')
		).toMatch(/attendu: « si nombre > 100 » n’est jamais vrai sur les essais.*essais:/);
		expect(
			messages(
				'niveau: 4e\nattendu: si nombre > 100 alors [ afficher 1 ] sinon [ afficher 2 ]\nessais: 1 ; 200'
			)
		).toBe('');
		expect(
			messages('niveau: 4e\nattendu: afficher 1 ; si nombre > −100 alors [ afficher 2 ]')
		).toMatch(/« si nombre > −100 » n’est jamais faux/);
	});
});

describe('réponse attendue avec niveau', () => {
	const essais = [1, 7];

	it('5e : forme inchangée', () => {
		expect(expectedCalculAnswer(essais, 'afficher nombre')).toBe('1 ; 7 | afficher nombre');
		expect(readExpectedCalculAnswer('1 ; 7 | afficher nombre')).toEqual({
			essais,
			attendu: 'afficher nombre',
			niveau: '5e'
		});
	});

	it('4e : préfixe relu', () => {
		const attendue = expectedCalculAnswer(essais, NOMINAL, '4e');
		expect(attendue).toBe(`4e | 1 ; 7 | ${NOMINAL}`);
		expect(readExpectedCalculAnswer(attendue)).toEqual({ essais, attendu: NOMINAL, niveau: '4e' });
	});

	it('le verdict suit le niveau', () => {
		const attendue = expectedCalculAnswer(essais, NOMINAL, '4e');
		expect(calculAnswerVerdict(NOMINAL, attendue).juste).toBe(true);
		const avecEt =
			'si nombre × 2 > 10 et 1 = 1 alors [ afficher nombre × 2 − 10 ] sinon [ afficher nombre × 2 ]';
		expect(calculAnswerVerdict(avecEt, attendue).juste).toBe(false);
		expect(calculAnswerVerdict(avecEt, expectedCalculAnswer(essais, NOMINAL, '3e')).juste).toBe(
			true
		);
	});
});
