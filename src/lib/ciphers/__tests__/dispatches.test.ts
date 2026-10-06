import { describe, expect, it } from 'vitest';
import { lettersOnly, normalizeText } from '../alphabet';
import { affineBruteForce } from '../affine';
import { atbash } from '../atbash';
import { letterFrequencies, caesarBruteForce } from '../frequency';
import { hillRowAttack, knownPlaintextAttack } from '../hill';
import { polybiusDecrypt } from '../polybius';
import { rsaCrack } from '../rsa';
import { scytaleCandidates } from '../scytale';
import { keyFromKeyword } from '../substitution';
import { crackVigenere, suggestKeyLength } from '../vigenere';
import {
	CIPHER_PATHS,
	CZAR_RSA_KEY,
	DISPATCHES,
	REPORT_PREFIX,
	checkAnswer,
	dispatchCiphertext,
	isUnlocked,
	type Dispatch
} from '../dispatches';

function dispatch(number: number): Dispatch {
	const found = DISPATCHES.find((d) => d.number === number);
	if (!found) throw new Error(`Dépêche ${number} absente`);
	return found;
}

describe('la campagne', () => {
	it('neuf dépêches numérotées de 1 à 9, un chiffre chacune', () => {
		expect(DISPATCHES.map((d) => d.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(new Set(DISPATCHES.map((d) => d.key.cipher)).size).toBe(9);
	});

	it('les clés partagées avec les pages d’outils sont celles des dépêches', () => {
		expect(dispatch(9).key).toEqual({ cipher: 'rsa', ...CZAR_RSA_KEY });
		expect(lettersOnly(dispatch(8).plaintext).startsWith(REPORT_PREFIX)).toBe(true);
	});

	it('le narrateur n’emprunte pas le juron du Czar', () => {
		// « Par Saint Georges » est réservé au Czar Alexis (Compendium, section V)
		for (const d of DISPATCHES) expect(d.epilogue).not.toMatch(/Saint Georges/);
	});

	it('chaque chiffre a sa page d’outils', () => {
		for (const d of DISPATCHES) expect(CIPHER_PATHS[d.key.cipher]).toMatch(/^\/chiffrement\//);
	});

	it('lore : jamais de pays réel pour le Czar, rien du Collège', () => {
		const all = DISPATCHES.map((d) =>
			[d.title, d.story, d.plaintext, ...d.hints, d.epilogue].join(' ')
		).join(' ');
		expect(all).not.toMatch(/Russ|Moscou|russe|Collège|Faustroll|hunyadi/i);
	});
});

// Chaque dépêche doit tomber sous l'attaque qu'annoncent ses indices
describe('chaque dépêche se décrypte avec les outils du Cabinet', () => {
	it('1. César : la force brute place le décalage 3 en tête', () => {
		const [best] = caesarBruteForce(dispatchCiphertext(dispatch(1)));
		expect(best.shift).toBe(3);
		expect(best.text).toBe(normalizeText(dispatch(1).plaintext));
	});

	it('2. Atbash : appliqué une fois de plus, le message revient', () => {
		expect(atbash(dispatchCiphertext(dispatch(2))).text).toBe(normalizeText(dispatch(2).plaintext));
	});

	it('3. Polybe : la grille déchiffre (J dans la case de I)', () => {
		expect(polybiusDecrypt(dispatchCiphertext(dispatch(3))).text).toBe(
			lettersOnly(dispatch(3).plaintext).replaceAll('J', 'I')
		);
	});

	it('4. Scytale : parmi les bâtons essayés, celui de 5 lettres rend le message', () => {
		const candidates = scytaleCandidates(dispatchCiphertext(dispatch(4)));
		expect(candidates.find((c) => c.lettersPerTurn === 5)?.text).toBe(
			lettersOnly(dispatch(4).plaintext)
		);
	});

	it('5. Substitution : la lettre chiffrée la plus fréquente cache bien E (premier indice)', () => {
		const { letters } = letterFrequencies(dispatchCiphertext(dispatch(5)));
		const top = [...letters].sort((a, b) => b.count - a.count)[0].letter;
		const key = keyFromKeyword('PALAIS DHIVER');
		expect(String.fromCharCode(65 + key.indexOf(top))).toBe('E');
	});

	it('6. Affine : la force brute place (11, 4) en tête', () => {
		expect(affineBruteForce(dispatchCiphertext(dispatch(6)), 1)[0]).toMatchObject({ a: 11, b: 4 });
	});

	it('7. Vigenère : longueur 5 proposée, clé HIVER retrouvée', () => {
		const ciphertext = dispatchCiphertext(dispatch(7));
		expect(suggestKeyLength(ciphertext)).toBe(5);
		expect(crackVigenere(ciphertext, 5).key).toBe('HIVER');
	});

	it('8. Hill : le clair connu RAPP redonne la matrice, l’attaque ligne par ligne aussi', () => {
		const ciphertext = dispatchCiphertext(dispatch(8));
		const key = { a: 9, b: 4, c: 5, d: 7 };
		expect(knownPlaintextAttack(lettersOnly(ciphertext).slice(0, 4), 'RAPP').key).toEqual(key);
		const rows = hillRowAttack(ciphertext);
		expect(rows.ok && rows.key).toEqual(key);
	});

	it('9. RSA : la clé publique (2021, 5) se factorise et la dépêche se lit', () => {
		const plain = lettersOnly(dispatch(9).plaintext);
		const expected = plain.length % 2 === 1 ? `${plain}X` : plain;
		expect(rsaCrack(dispatchCiphertext(dispatch(9)), 2021, 5).text).toBe(expected);
	});
});

describe('checkAnswer', () => {
	it('tolère accents, espaces, ponctuation et casse', () => {
		expect(
			checkAnswer(
				dispatch(1),
				'rendez vous a la tour du vieux moulin au coucher du soleil apportez les cartes du royaume'
			)
		).toBe(true);
	});

	it('une lettre fausse suffit à refuser', () => {
		expect(checkAnswer(dispatch(1), dispatch(1).plaintext.replace('moulin', 'moulon'))).toBe(false);
	});

	it('réponse vide → refusée', () => {
		expect(checkAnswer(dispatch(1), '  !! ')).toBe(false);
	});

	it('Polybe : J ou I indifféremment', () => {
		expect(checkAnswer(dispatch(3), dispatch(3).plaintext)).toBe(true);
		expect(checkAnswer(dispatch(3), lettersOnly(dispatch(3).plaintext).replaceAll('J', 'I'))).toBe(
			true
		);
	});

	it('Hill et RSA : avec ou sans le X de complément', () => {
		for (const n of [8, 9]) {
			const letters = lettersOnly(dispatch(n).plaintext);
			expect(checkAnswer(dispatch(n), letters)).toBe(true);
			if (letters.length % 2 === 1) expect(checkAnswer(dispatch(n), `${letters}X`)).toBe(true);
		}
	});

	it('ailleurs, un X ajouté est une faute', () => {
		expect(checkAnswer(dispatch(2), `${lettersOnly(dispatch(2).plaintext)}X`)).toBe(false);
	});
});

describe('isUnlocked', () => {
	it('la première est ouverte, les suivantes après la précédente', () => {
		expect(isUnlocked(1, [])).toBe(true);
		expect(isUnlocked(2, [])).toBe(false);
		expect(isUnlocked(2, [1])).toBe(true);
		expect(isUnlocked(4, [1, 2])).toBe(false);
	});
});
