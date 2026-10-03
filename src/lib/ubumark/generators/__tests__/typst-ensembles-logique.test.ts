/**
 * Ensembles et logique dans le PDF (relevé sur les modèles de logique 1re SPE, 2026-10-03).
 *
 * Une commande collée à la suivante (`\mathbb{N}\subset`) formait un identifiant inconnu
 * (`NNsubset`) et faisait échouer TOUTE la fiche ; plusieurs commandes sortaient en texte brut.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToTypstMath } from '../typst-generator';

describe('commandes collées : jamais un identifiant fusionné', () => {
	it('\\mathbb{N}\\subset\\mathbb{Z} (le « } » converti plus tard)', () => {
		expect(convertLatexToTypstMath('\\mathbb{N}\\subset\\mathbb{Z}')).toBe('NN subset ZZ');
		expect(convertLatexToTypstMath('\\mathbb{N}\\subseteq\\mathbb{Z}')).toBe('NN subset.eq ZZ');
		expect(convertLatexToTypstMath('\\mathbb{N}\\cap\\mathbb{Z}')).toBe('NN sect ZZ');
		expect(convertLatexToTypstMath('\\mathbb{N}\\cup\\mathbb{Z}')).toBe('NN union ZZ');
	});

	it('groupe {…} effacé avant un opérateur ou une lettre grecque', () => {
		expect(convertLatexToTypstMath('{A}\\cap B')).toBe('A sect B');
		expect(convertLatexToTypstMath('{x}\\pi')).toBe('x pi');
	});

	it('caractère hors ASCII (𝔻, ℝ) avant ou après la commande', () => {
		expect(convertLatexToTypstMath('𝔻\\subset\\mathbb{Q}')).toBe('𝔻 subset QQ');
		expect(convertLatexToTypstMath('ℝ\\subset ℂ')).toBe('ℝ subset ℂ');
		expect(convertLatexToTypstMath('x\\in𝔻')).toBe('x in 𝔻');
	});

	it("groupe {…} après l'opérateur", () => {
		expect(convertLatexToTypstMath('a\\cdot{b}')).toBe('a dot.c b');
	});
});

describe('\\mathbb : toute lettre', () => {
	it('R, N, Z, Q, C : symboles doublés (inchangé)', () => {
		expect(convertLatexToTypstMath('\\mathbb{R}')).toBe('RR');
		expect(convertLatexToTypstMath('\\mathbb{N}^*')).toBe('NN^*');
	});

	it('autres lettres : bb(X)', () => {
		expect(convertLatexToTypstMath('\\mathbb{D}')).toBe('bb(D)');
		expect(convertLatexToTypstMath('\\mathbb{K}')).toBe('bb(K)');
		expect(convertLatexToTypstMath('\\mathbb D')).toBe('bb(D)');
		expect(convertLatexToTypstMath('\\mathbb{D}\\subset\\mathbb{Q}')).toBe('bb(D) subset QQ');
		expect(convertLatexToTypstMath('x\\in\\mathbb{D}')).toBe('x in bb(D)');
	});
});

describe('négations, logique, opérateurs nommés', () => {
	it('inclusions et appartenances niées', () => {
		expect(convertLatexToTypstMath('A\\not\\subset B')).toBe('A subset.not B');
		expect(convertLatexToTypstMath('A\\nsubset B')).toBe('A subset.not B');
		expect(convertLatexToTypstMath('A\\not\\subseteq B')).toBe('A subset.eq.not B');
		expect(convertLatexToTypstMath('A\\nsubseteq B')).toBe('A subset.eq.not B');
		expect(convertLatexToTypstMath('A\\not\\supset B')).toBe('A supset.not B');
		expect(convertLatexToTypstMath('x\\not\\in A')).toBe('x in.not A');
		expect(convertLatexToTypstMath('x\\notin A')).toBe('x in.not A');
		expect(convertLatexToTypstMath('A\\ni x')).toBe('A in.rev x');
		expect(convertLatexToTypstMath('a\\not= b')).toBe('a!= b');
		expect(convertLatexToTypstMath('\\mathbb{Q}\\not\\subset\\mathbb{D}')).toBe(
			'QQ subset.not bb(D)'
		);
	});

	it('connecteurs logiques', () => {
		expect(convertLatexToTypstMath('\\neg P')).toBe('¬ P');
		expect(convertLatexToTypstMath('\\lnot P')).toBe('¬ P');
		expect(convertLatexToTypstMath('P\\wedge Q')).toBe('P ∧ Q');
		expect(convertLatexToTypstMath('P\\land Q')).toBe('P ∧ Q');
		expect(convertLatexToTypstMath('P\\vee Q')).toBe('P ∨ Q');
		expect(convertLatexToTypstMath('P\\lor Q')).toBe('P ∨ Q');
		expect(convertLatexToTypstMath('\\neg(P\\wedge Q)')).toBe('¬ (P ∧ Q)');
	});

	it('complémentaire', () => {
		expect(convertLatexToTypstMath('\\complement_E A')).toBe('∁_E A');
	});

	it('\\operatorname{Card}', () => {
		expect(convertLatexToTypstMath('\\operatorname{Card}(A)')).toBe('op("Card")(A)');
		expect(convertLatexToTypstMath('n=\\operatorname{Card}(A\\cup B)')).toBe(
			'n=op("Card")(A union B)'
		);
	});
});

describe('déjà correct (garde-fou)', () => {
	it.each([
		['A\\setminus B', 'A ∖ B'],
		['\\emptyset', 'emptyset'],
		['\\varnothing', 'emptyset'],
		['P\\Rightarrow Q', 'P=> Q'],
		['P\\Leftrightarrow Q', 'P<=> Q'],
		['P\\iff Q', 'P<=> Q'],
		['P\\implies Q', 'P=> Q'],
		['\\forall x\\in\\mathbb{R}', 'forall x in RR'],
		['\\exists n\\in\\mathbb{N}', 'exists n in NN'],
		['\\overline{A}', 'overline(A)'],
		['A\\times B', 'A times B']
	])('%s', (latex, typst) => {
		expect(convertLatexToTypstMath(latex)).toBe(typst);
	});
});
