import { describe, expect, it } from 'vitest';
import { lettersOnly, mod, normalizeText, toBlocks } from '../alphabet';

describe('normalizeText', () => {
	it('met en majuscules et retire les accents', () => {
		expect(normalizeText('Été à Noël')).toBe('ETE A NOEL');
	});

	it('développe les ligatures et retire la cédille', () => {
		expect(normalizeText('œuf, cœur, ça, Æsop')).toBe('OEUF, COEUR, CA, AESOP');
	});

	it('conserve chiffres, espaces et ponctuation', () => {
		expect(normalizeText("J'ai 3 ans !")).toBe("J'AI 3 ANS !");
	});

	it('lettres sans décomposition (polonais, danois…) ramenées à A-Z', () => {
		expect(normalizeText('Łódź, Øre, Đ, Ħ')).toBe('LODZ, ORE, D, H');
	});

	it('ß devient SS', () => {
		expect(normalizeText('Straße')).toBe('STRASSE');
	});

	it('un caractère qui ne devient pas une lettre traverse sans changer (≠ reste ≠, π reste π)', () => {
		expect(normalizeText('x ≠ 3, π')).toBe('X ≠ 3, π');
	});

	it('un accent déjà décomposé (e + accent) donne la lettre seule', () => {
		expect(normalizeText('e\u0301')).toBe('E');
	});

	it('texte vide → texte vide', () => {
		expect(normalizeText('')).toBe('');
	});
});

describe('lettersOnly', () => {
	it('ne garde que les 26 lettres, normalisées', () => {
		expect(lettersOnly("L'été, 2026 !")).toBe('LETE');
	});
});

describe('toBlocks', () => {
	it('groupe les lettres par 5', () => {
		expect(toBlocks("ATTAQUE A L'AUBE")).toBe('ATTAQ UEALA UBE');
	});

	it('longueur multiple de 5 : pas d’espace final', () => {
		expect(toBlocks('ABCDEFGHIJ')).toBe('ABCDE FGHIJ');
	});

	it('texte sans lettre → vide', () => {
		expect(toBlocks('12 !')).toBe('');
	});
});

describe('mod', () => {
	it('rend toujours un reste entre 0 et m − 1', () => {
		expect(mod(27, 26)).toBe(1);
		expect(mod(-1, 26)).toBe(25);
		expect(mod(-26, 26)).toBe(0);
	});
});
