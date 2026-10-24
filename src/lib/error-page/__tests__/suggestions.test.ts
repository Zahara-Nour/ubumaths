import { describe, expect, it } from 'vitest';
import { suggestPages } from '../suggestions';

const paths = (pathname: string) => suggestPages(pathname).map((s) => s.path);

describe('suggestPages', () => {
	it('adresse trop longue → la page parente, la plus profonde d’abord', () => {
		expect(paths('/chiffrement/cesar/exercice-3')[0]).toBe('/chiffrement/cesar');
		expect(paths('/chiffrement/cesar/exercice-3')).toContain('/chiffrement');
	});

	it('dossier sans page propre → ses pages filles', () => {
		expect(paths('/legal')).toEqual(
			expect.arrayContaining(['/legal/mentions-legales', '/legal/confidentialite', '/legal/cgu'])
		);
	});

	it.each([
		['/chifrement', '/chiffrement'],
		['/glosaire', '/glossaire'],
		['/pyhton', '/python'],
		['/almanac', '/almanach'],
		['/cesar', '/chiffrement/cesar'],
		['/vigenère', '/chiffrement/vigenere'],
		['/ATELIER/', '/atelier']
	])('faute de frappe %s → %s', (typed, expected) => {
		expect(paths(typed)[0]).toBe(expected);
	});

	it('donne le titre de la page', () => {
		expect(suggestPages('/chifrement')[0]).toEqual({
			path: '/chiffrement',
			title: 'Le Cabinet Noir'
		});
	});

	it('ne propose rien pour une adresse sans rapport', () => {
		expect(paths('/re')).toEqual([]);
		expect(paths('/zzzzzzzz')).toEqual([]);
	});

	it('ne propose jamais l’accueil, qui a son propre bouton', () => {
		expect(paths('/')).toEqual([]);
		expect(paths('/acceuil')).not.toContain('/');
	});

	it('au plus trois suggestions', () => {
		expect(paths('/chiffrement/x').length).toBeLessThanOrEqual(3);
		expect(paths('/legal').length).toBeLessThanOrEqual(3);
	});

	it('une adresse mal encodée ne fait pas planter la page', () => {
		expect(() => suggestPages('/%E9')).not.toThrow();
	});
});
