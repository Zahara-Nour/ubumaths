import { describe, expect, it } from 'vitest';
import { lettersOnly } from '../alphabet';
import { CipherInputError } from '../errors';
import { scytaleCandidates, scytaleDecrypt, scytaleEncrypt } from '../scytale';
import { randomText, seededRandom } from './helpers';

describe('scytale', () => {
	it('ATTAQUE A L’AUBE, 3 lettres par tour', () => {
		const result = scytaleEncrypt("Attaque à l'aube", 3);
		// Le message s'écrit le long du bâton, une ligne par face :
		expect(result.rows).toEqual(['ATTAQ', 'UEAL', 'AUBE']);
		// … et la bande déroulée se lit tour par tour (colonne par colonne)
		expect(result.text).toBe('AUATEUTABALEQ');
		expect(result.unchanged).toBe(false);
	});

	it('longueur multiple du nombre de lettres par tour : grille pleine', () => {
		expect(scytaleEncrypt('ABCDEF', 2)).toEqual({
			text: 'ADBECF',
			rows: ['ABC', 'DEF'],
			unchanged: false
		});
	});

	it('déchiffre : AUATEUTABALEQ → ATTAQUEALAUBE', () => {
		expect(scytaleDecrypt('AUATEUTABALEQ', 3).text).toBe('ATTAQUEALAUBE');
	});

	it('aller-retour exact sans bourrage, pour 400 cas tirés', () => {
		const rand = seededRandom(1896);
		for (let i = 0; i < 400; i++) {
			const text = randomText(rand, 80);
			const turns = 2 + Math.floor(rand() * 10);
			const encrypted = scytaleEncrypt(text, turns).text;
			expect(scytaleDecrypt(encrypted, turns).text).toBe(lettersOnly(text));
		}
	});

	it('aucune lettre X ajoutée', () => {
		expect(scytaleEncrypt('ABCDE', 3).text).toHaveLength(5);
	});

	it('autant de lettres par tour que de lettres : rien ne bouge, et on le signale', () => {
		expect(scytaleEncrypt('UBU', 3)).toEqual({
			text: 'UBU',
			rows: ['U', 'B', 'U'],
			unchanged: true
		});
		expect(scytaleEncrypt('UBU', 5).unchanged).toBe(true);
	});

	it('moins de 2 lettres par tour, ou nombre non entier → erreur', () => {
		expect(() => scytaleEncrypt('UBU ROI', 1)).toThrow(CipherInputError);
		expect(() => scytaleDecrypt('UBU ROI', 2.5)).toThrow(CipherInputError);
	});

	it('un bâton immense ne fait pas planter le module', () => {
		expect(scytaleEncrypt('abc', 1e10)).toEqual({
			text: 'ABC',
			rows: ['A', 'B', 'C'],
			unchanged: true
		});
		expect(scytaleDecrypt('abc', 1e10).text).toBe('ABC');
	});

	it('texte vide → vide', () => {
		expect(scytaleEncrypt('', 3).text).toBe('');
		expect(scytaleDecrypt('', 3).text).toBe('');
	});
});

describe('scytaleCandidates', () => {
	it('essaie chaque bâton : le bon figure parmi les candidats', () => {
		const encrypted = scytaleEncrypt("Attaque à l'aube", 4).text;
		const candidates = scytaleCandidates(encrypted);
		expect(candidates.map((c) => c.lettersPerTurn)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(candidates.find((c) => c.lettersPerTurn === 4)?.text).toBe('ATTAQUEALAUBE');
	});

	it('s’arrête avant le bâton qui ne change rien', () => {
		expect(scytaleCandidates('ABCD').map((c) => c.lettersPerTurn)).toEqual([2, 3]);
	});

	it('moins de 3 lettres → aucun candidat', () => {
		expect(scytaleCandidates('AB')).toEqual([]);
		expect(scytaleCandidates('')).toEqual([]);
	});
});
