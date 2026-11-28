/**
 * Bloc ```yohaku : parseur, totaux calculés, juge par les contraintes (chantier `outil-yohaku`)
 */

import { describe, it, expect } from 'vitest';
import {
	findYohakusARemplir,
	hasYohakuARemplir,
	parseYohakuContent
} from '#lib/ubumark/parser/yohaku-parser.ts';
import {
	ecrireReponse,
	YOHAKU_ILLISIBLE,
	expectedYohakuAnswer,
	readExpectedYohakuAnswer,
	yohakuAnswerVerdict,
	yohakuSolutionAnswer,
	YOHAKU_INCOMPLET
} from '#lib/ubumark/utils/yohaku-answer.ts';

const PRODUIT = ['opération: produit', 'ligne: [x+2] | [x+3]', 'ligne: [2x+1] | [x+1]'].join('\n');

const SOMME = ['opération: somme', 'ligne: [3] | 7', 'ligne: [5] | [4]'].join('\n');

const attenduDe = (source: string): string => {
	const node = parseYohakuContent(source);
	if (node.spec === null) throw new Error(node.errors.map((e) => e.message).join(' ; '));
	return expectedYohakuAnswer(node.spec);
};

const sansEspaces = (s: string) => s.replace(/\s+/g, '');

describe('parseur', () => {
	it('lit la grille et calcule les produits développés réduits', () => {
		const node = parseYohakuContent(PRODUIT);
		expect(node.errors).toEqual([]);
		expect(node.spec?.operation).toBe('produit');
		expect(node.spec?.lignes.map(sansEspaces)).toEqual(['x^2+5x+6', '2x^2+3x+1']);
		expect(node.spec?.colonnes.map(sansEspaces)).toEqual(['2x^2+5x+2', 'x^2+4x+3']);
		expect(node.spec?.cases.flat().every((c) => c.aRemplir)).toBe(true);
	});

	it('calcule les sommes ; une case sans crochets est donnée', () => {
		const node = parseYohakuContent(SOMME);
		expect(node.spec?.lignes).toEqual(['10', '9']);
		expect(node.spec?.colonnes).toEqual(['8', '11']);
		expect(node.spec?.cases[0][1]).toMatchObject({ latex: '7', aRemplir: false });
	});

	it('nettoie une case tirée (1x+-3 → x − 3)', () => {
		const node = parseYohakuContent(
			['opération: produit', 'ligne: [1x+-3] | [x+0]', 'ligne: [2] | [x+1]'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(sansEspaces(node.spec?.cases[0][0].latex ?? '')).toBe('x-3');
		expect(sansEspaces(node.spec?.lignes[0] ?? '')).toBe('x^2-3x');
	});

	it('accepte « operation » sans accent, et case: posée par le générateur', () => {
		const node = parseYohakuContent(
			['operation: somme', 'ligne: [1] | 2', 'ligne: 3 | 4', 'case: 2'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
	});

	it.each([
		[['ligne: [1] | 2', 'ligne: 3 | 4'], 'il manque la ligne opération'],
		[['opération: quotient', 'ligne: [1] | 2', 'ligne: 3 | 4'], 'somme ou produit'],
		[['opération: somme', 'ligne: [1] | 2'], 'il faut 2 lignes'],
		[['opération: somme', 'ligne: [1] | 2', 'ligne: 3 | 4', 'ligne: 5 | 6'], '2 lignes seulement'],
		[['opération: somme', 'ligne: [1] | 2 | 3', 'ligne: 3 | 4'], '2 cases séparées par |'],
		[['opération: somme', 'ligne: 1 | 2', 'ligne: 3 | 4'], 'aucune case à remplir'],
		[['opération: somme', 'ligne: [] | 2', 'ligne: 3 | 4'], 'case vide'],
		[['opération: somme', 'ligne: [2+*] | 2', 'ligne: 3 | 4'], 'illisible'],
		[['opération: somme', 'grille: 2 x 2'], 'inconnue'],
		[['opération: somme', 'ligne: [x=2] | 3', 'ligne: 3 | 4'], 'pas une égalité'],
		[['opération: somme', 'ligne: [|x|] | 3', 'ligne: 3 | 4'], 'pas de valeur absolue'],
		[['opération: somme', 'ligne: [?] | 3', 'ligne: 3 | 4'], 'demande la ligne totaux'],
		[
			['opération: somme', 'ligne: [1] | 3', 'ligne: 3 | 4', 'totaux: 4 ; 7 | 4 ; 7'],
			'seulement avec des cases [?]'
		],
		[['opération: somme', 'ligne: [?] | 3', 'ligne: 3 | 4', 'totaux: 4 ; 7'], 'L1 ; L2 | C1 ; C2']
	])('refuse à l’auteur %j', (lignes, attendu) => {
		const node = parseYohakuContent(lignes.join('\n'));
		expect(node.spec).toBeNull();
		expect(node.errors.map((e) => e.message).join(' ; ')).toContain(attendu);
	});
});

describe('décimaux et énoncé masqué', () => {
	it('virgule décimale acceptée et écrite à la française', () => {
		const node = parseYohakuContent(
			['opération: somme', 'ligne: [2,5] | 3', 'ligne: 1 | 4'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.cases[0][0].latex).toBe('2{,}5');
		expect(node.spec?.lignes[0]).toBe('5{,}5');
		expect(node.spec?.colonnes[0]).toBe('3{,}5');
	});

	it('grille masquée : cases [?] vides, totaux lus sur totaux:', () => {
		const node = parseYohakuContent(
			[
				'opération: produit',
				'ligne: [?] | [?]',
				'ligne: [?] | x+1',
				'totaux: x^2+5x+6 ; 2x^2+3x+1 | 2x^2+5x+2 ; x^2+4x+3'
			].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.cases[0][0]).toEqual({ source: '', latex: '', aRemplir: true });
		expect(node.spec?.lignes.map(sansEspaces)).toEqual(['x^2+5x+6', '2x^2+3x+1']);
		expect(node.spec?.colonnes.map(sansEspaces)).toEqual(['2x^2+5x+2', 'x^2+4x+3']);
	});
});

describe('repérage dans un énoncé', () => {
	it('une grille avec une case entre crochets est à remplir', () => {
		const md = ['Complète la grille.', '', '```yohaku', SOMME, '```'].join('\n');
		expect(hasYohakuARemplir(md)).toBe(true);
		expect(findYohakusARemplir(md)[0]).toMatchObject({
			startIndex: 2,
			closed: true,
			nested: false
		});
	});

	it('une grille en retrait est repérée comme imbriquée', () => {
		const md = ['- item', '  ```yohaku', '  opération: somme', '  ligne: [1] | 2', '  ```'].join(
			'\n'
		);
		expect(findYohakusARemplir(md)[0]?.nested).toBe(true);
	});
});

describe('juge', () => {
	const attendu = attenduDe(PRODUIT);

	it('réponse attendue relue', () => {
		expect(readExpectedYohakuAnswer(attendu)?.operation).toBe('produit');
		expect(readExpectedYohakuAnswer('pas du json')).toBeNull();
	});

	it('la solution de l’auteur est juste', () => {
		const exemple = yohakuSolutionAnswer(readExpectedYohakuAnswer(attendu)!);
		expect(yohakuAnswerVerdict(exemple, attendu).juste).toBe(true);
	});

	it('un autre remplissage juste est juste (fractions comprises)', () => {
		const reponse = ecrireReponse(['2x+4', '\\frac{1}{2}x+\\frac{3}{2}', 'x+\\frac{1}{2}', '2x+2']);
		expect(yohakuAnswerVerdict(reponse, attendu)).toMatchObject({ juste: true });
	});

	it('cases échangées dans chaque ligne : les lignes tombent, plus les colonnes', () => {
		// x+3 | x+2 / x+1 | 2x+1 : colonnes (x+3)(x+1) et (x+2)(2x+1), échangées
		const reponse = ecrireReponse(['x+3', 'x+2', 'x+1', '2x+1']);
		const verdict = yohakuAnswerVerdict(reponse, attendu);
		expect(verdict.juste).toBe(false);
		expect(verdict.colonnesFausses).toEqual([0, 1]);
	});

	it('une ligne fausse est nommée et marquée', () => {
		// 2e ligne : (2x+1)(x+2) = 2x²+5x+2 au lieu de 2x²+3x+1 ; 2e colonne fausse aussi
		const reponse = ecrireReponse(['x+2', 'x+3', '2x+1', 'x+2']);
		const verdict = yohakuAnswerVerdict(reponse, attendu);
		expect(verdict).toMatchObject({
			juste: false,
			lignesFausses: [1],
			colonnesFausses: [1],
			message: 'La 2e ligne et la 2e colonne ne donnent pas le bon produit.'
		});
	});

	it('une seule ligne fausse : message au singulier', () => {
		const somme = attenduDe(SOMME);
		// 3 | 7 / 5 | 4 juste ; 3 | 7 / 6 | 4 : 2e ligne 10 ≠ 9, 1re colonne 9 ≠ 8
		expect(yohakuAnswerVerdict(ecrireReponse(['3', '5', '4']), somme).juste).toBe(true);
		expect(yohakuAnswerVerdict(ecrireReponse(['3', '6', '4']), somme).message).toBe(
			'La 2e ligne et la 1re colonne ne donnent pas la bonne somme.'
		);
		// Somme : une case donnée (7) gardée ; un autre remplissage juste n'existe pas ici
		expect(yohakuAnswerVerdict(ecrireReponse(['2', '6', '5']), somme).juste).toBe(false);
	});

	it('somme à plusieurs solutions : toute grille qui tombe juste', () => {
		const libre = attenduDe(
			['opération: somme', 'ligne: [3] | [7]', 'ligne: [5] | [4]'].join('\n')
		);
		expect(yohakuAnswerVerdict(ecrireReponse(['4', '6', '4', '5']), libre).juste).toBe(true);
		expect(yohakuAnswerVerdict(ecrireReponse(['0', '10', '8', '1']), libre).juste).toBe(true);
	});

	it('une parenthèse glissée dans une case ne sort pas de sa case (revue du 2026-11-28)', () => {
		const pieges = attenduDe(
			['opération: produit', 'ligne: [2] | [3]', 'ligne: [3] | [2]'].join('\n')
		);
		const reponse = ecrireReponse(['1\\right)+\\left(1', '5', '5', '\\frac65']);
		expect(yohakuAnswerVerdict(reponse, pieges)).toMatchObject({
			juste: false,
			message: YOHAKU_ILLISIBLE
		});
	});

	it('une égalité dans une case est illisible, pas une ligne fausse', () => {
		const reponse = ecrireReponse(['x+2', 'x+3', '2x+1=0', 'x+1']);
		expect(yohakuAnswerVerdict(reponse, attendu)).toMatchObject({
			juste: false,
			message: YOHAKU_ILLISIBLE
		});
	});

	it('décimaux : la réponse à virgule de MathLive est lue', () => {
		const dec = attenduDe(['opération: somme', 'ligne: [2,5] | 3', 'ligne: [1] | 4'].join('\n'));
		expect(yohakuAnswerVerdict(ecrireReponse(['2{,}5', '1']), dec).juste).toBe(true);
		expect(yohakuAnswerVerdict(ecrireReponse(['2.5', '1']), dec).juste).toBe(true);
	});

	it('une case vide : « Remplis toutes les cases. »', () => {
		expect(yohakuAnswerVerdict(ecrireReponse(['x+2', '', '2x+1', 'x+1']), attendu)).toMatchObject({
			juste: false,
			message: YOHAKU_INCOMPLET
		});
		expect(yohakuAnswerVerdict('', attendu).message).toBe(YOHAKU_INCOMPLET);
	});

	it('une attente illisible n’est jamais juste', () => {
		expect(yohakuAnswerVerdict(ecrireReponse(['1']), '{}').juste).toBe(false);
	});
});
