import { describe, test, expect } from 'vitest';
import {
	deletionConfirmationName,
	matchesDeletionConfirmation
} from '#lib/utils/student-deletion.ts';

const base = { firstname: null, lastname: null, full_name: null, email: null };

describe('nom à retaper pour supprimer un élève', () => {
	test('« Prénom Nom » quand les deux existent', () => {
		expect(deletionConfirmationName({ ...base, firstname: 'Zoé', lastname: 'Martin' })).toBe(
			'Zoé Martin'
		);
	});

	test('repli sur le nom complet, puis sur l’adresse', () => {
		expect(deletionConfirmationName({ ...base, firstname: 'Zoé', full_name: 'Zoé M.' })).toBe(
			'Zoé M.'
		);
		expect(deletionConfirmationName({ ...base, email: 'eleve01@local.test' })).toBe(
			'eleve01@local.test'
		);
	});

	test('espaces multiples et de bord ignorés, des deux côtés', () => {
		const eleve = { ...base, firstname: ' Zoé ', lastname: 'Le  Gall' };
		expect(deletionConfirmationName(eleve)).toBe('Zoé Le Gall');
		expect(matchesDeletionConfirmation('  Zoé Le Gall ', eleve)).toBe(true);
	});

	test('accent saisi en deux caractères (NFD) accepté', () => {
		const eleve = { ...base, firstname: 'Zoé', lastname: 'Martin' };
		expect(matchesDeletionConfirmation('Zoé Martin', eleve)).toBe(true);
	});

	test('casse et accents comptent', () => {
		const eleve = { ...base, firstname: 'Zoé', lastname: 'Martin' };
		expect(matchesDeletionConfirmation('zoé martin', eleve)).toBe(false);
		expect(matchesDeletionConfirmation('Zoe Martin', eleve)).toBe(false);
	});

	test('élève sans aucun nom : jamais confirmable', () => {
		expect(deletionConfirmationName(base)).toBe('');
		expect(matchesDeletionConfirmation('', base)).toBe(false);
		expect(matchesDeletionConfirmation('   ', base)).toBe(false);
	});
});
