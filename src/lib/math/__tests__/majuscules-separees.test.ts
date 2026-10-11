/**
 * Q-E (validée le 2026-10-12) sur le vrai chemin des réponses : deux majuscules
 * COLLÉES sont une longueur (`AB`), SÉPARÉES un produit (`A B`).
 *
 * Mesuré dans Chromium (MathLive 0.111.1, `mathModeSpace = '\,'` comme les champs
 * de réponse des questions) : « A espace B » s'écrit `A\,B`. Le retrait des
 * espacements (`stripLatexSpacing`, `removeSpaces` de `checkForm`) collait les deux
 * lettres et en faisait une longueur : il doit garder un séparateur entre elles.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent, stripLatexSpacing } from '$lib/math';
import { removeSpaces, checkForm } from '$lib/mathAST/cosmetic-transforms';

describe('majuscules séparées par une espace de MathLive : un produit', () => {
	it('A\\,B ≡ A×B', () => {
		expect(areEquivalent('A\\,B', 'A\\times B')).toBe(true);
	});

	it('A\\,B ≢ AB (la longueur)', () => {
		expect(areEquivalent('A\\,B', 'AB')).toBe(false);
	});

	it('3\\,A\\,B ≡ 3A×B, et 3\\,AB reste 3 fois la longueur AB', () => {
		expect(areEquivalent('3\\,A\\,B', '3A\\times B')).toBe(true);
		expect(areEquivalent('3\\,AB', '3AB')).toBe(true);
		expect(areEquivalent('3\\,AB', '3A\\times B')).toBe(false);
	});

	it("A'\\,B' et A_1\\,B_1 : séparés, ce sont des produits", () => {
		expect(areEquivalent("A'\\,B'", "AB'")).toBe(false);
		expect(areEquivalent('A_1\\,B_1', 'A_1B_1')).toBe(false);
	});

	it('les espaces de groupement des nombres disparaissent toujours', () => {
		expect(stripLatexSpacing('12\\,345')).toBe('12345');
		expect(removeSpaces('12\\,345')).toBe('12345');
	});

	it('stripLatexSpacing et removeSpaces gardent une espace entre deux majuscules', () => {
		expect(stripLatexSpacing('A\\,B')).toBe('A B');
		expect(removeSpaces('A\\,B')).toBe('A B');
		expect(stripLatexSpacing('A\\,\\,B')).toBe('A B');
	});

	it('checkForm : A\\,B n’est pas la longueur AB', () => {
		expect(checkForm('A\\,B', 'AB', {}).valid).toBe(false);
	});
});
