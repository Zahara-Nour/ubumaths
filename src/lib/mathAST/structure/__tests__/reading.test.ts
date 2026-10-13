/**
 * Structure d'une expression — lecture en français (lot 2)
 * ========================================================
 *
 * Spécification : `docs/systeme/mathast/structure-expression.md`, section B
 * (B1-B15, accords, contractions). Trois familles de tests :
 * - le TEXTE de la lecture (formules rendues en texte brut, `-` → `−`) ;
 * - les MOTS du dictionnaire et leurs clés (identifiants `termId` du lexique) ;
 * - le RATTACHEMENT de chaque morceau à la sous-expression qu'il désigne.
 *
 * Entrées PARSÉES (invariant 4 du module), coefficients ≠ 1.
 */
import { describe, expect, it } from 'vitest';
import { termId } from '$lib/lexicon/linker';
import { REFERENCE_DICTIONARY } from '../../../../../tests/fixtures/lexique/dictionnaire-reference';
import { READING_WORDS_2026_10_11 } from '../../../../../tests/fixtures/lexique/mots-lecture-2026-10-11';
import { READING_WORD_KEYS } from '../reading';
import {
	readingOf,
	readingPlainText,
	stripMarkers,
	structureFromLatex,
	type ExpressionStructure,
	type Reading,
	type ReadingSegment,
	type StructureNode
} from '..';

// Fonctions
function structureOf(latex: string): ExpressionStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`${latex} : ${result.status}`);
	return result.structure;
}

function read(latex: string): string {
	return readingPlainText(readingOf(structureOf(latex)));
}

function words(reading: Reading): ReadingSegment[] {
	return reading.segments.filter((s) => s.kind === 'word');
}

/** Le segment « mot » de texte `text` (le premier) */
function wordSegment(reading: Reading, text: string): ReadingSegment {
	const found = reading.segments.find((s) => s.kind === 'word' && s.text === text);
	if (!found) throw new Error(`mot « ${text} » absent`);
	return found;
}

/** Le segment « formule » de LaTeX `latex` (le premier) */
function formulaSegment(reading: Reading, latex: string): ReadingSegment {
	const found = reading.segments.find((s) => s.kind === 'formula' && s.latex === latex);
	if (!found) throw new Error(`formule « ${latex} » absente`);
	return found;
}

function nodeOf(structure: ExpressionStructure, segment: ReadingSegment): StructureNode {
	return structure.nodes[segment.node];
}

describe('lecture : tableau B de la spécification', () => {
	it.each([
		['B1', '2+3y', 'la somme de 2 et du produit de 3 par y'],
		['B2', 'a+b+c', 'la somme de a, b et c'],
		['B3', '5-3', 'la différence de 5 et 3'],
		['B4', '5-3+x', 'la somme de 5, −3 et x'],
		['B5', '-3+x', 'la somme de −3 et x'],
		['B6', 'a\\times b\\times c', 'le produit de a, b et c'],
		['B7 (÷)', 'a\\div b', 'le quotient de a par b'],
		['B7 (fraction)', '\\frac{a}{b}', 'le quotient de a par b'],
		['B8', '-a', "l'opposé de a"],
		['B9 (carré)', 'x^2', 'le carré de x'],
		['B9 (cube)', 'x^3', 'le cube de x'],
		['B9 (puissance 4)', 'x^4', 'x puissance 4'],
		['B9 (puissance −1)', 'x^{-1}', 'x puissance −1'],
		['B10', '\\sqrt{a}', 'la racine carrée de a'],
		['B11', '(a+b)', 'la somme de a et b'],
		['B12', '2x+3=7', 'la somme du produit de 2 par x et de 3 est égale à 7'],
		['B13 (image)', 'f(x)', "l'image de x par f"],
		['B13 (sinus)', '\\sin x', 'le sinus de x'],
		['B13 (ln)', '\\ln x', 'le logarithme népérien de x'],
		['B14', '(2+x)^2', 'le carré de la somme de 2 et x'],
		['B15', '-3y+x', "la somme de l'opposé du produit de 3 par y et de x"]
	])('%s : %s → %s', (_, latex, expected) => {
		expect(read(latex)).toBe(expected);
	});
});

describe('lecture : le « − » en tête et les termes soustraits', () => {
	it("−3x seul : l'opposé du produit", () => {
		expect(read('-3x')).toBe("l'opposé du produit de 3 par x");
	});

	it('un nombre soustrait se lit signé, un autre terme « l’opposé de »', () => {
		expect(read('4x-7y+2')).toBe(
			"la somme du produit de 4 par x, de l'opposé du produit de 7 par y et de 2"
		);
	});

	it('différence : le second terme se lit sans signe, avec son article', () => {
		expect(read('5-2x')).toBe('la différence de 5 et du produit de 2 par x');
	});

	it('différence dont le second terme est entre parenthèses', () => {
		expect(read('5-(3+x)')).toBe('la différence de 5 et de la somme de 3 et x');
	});

	it('nombre négatif seul ou en facteur : signé', () => {
		expect(read('-3')).toBe('−3');
		expect(read('2\\times(-3)')).toBe('le produit de 2 par −3');
	});

	it("−3² : l'opposé du carré de 3", () => {
		expect(read('-3^2')).toBe("l'opposé du carré de 3");
	});
});

describe('lecture : contractions', () => {
	it('« de le » → « du »', () => {
		expect(read('5\\times(2x)')).toBe('le produit de 5 et du produit de 2 par x');
		expect(read('(4x)^2')).toBe('le carré du produit de 4 par x');
	});

	it('« de la » reste', () => {
		expect(read('\\sqrt{2+x}')).toBe('la racine carrée de la somme de 2 et x');
	});

	it("« de l' » devant une voyelle", () => {
		expect(read('(-5a)^2')).toBe("le carré de l'opposé du produit de 5 par a");
		expect(read('-\\exp(2x)')).toBe("l'opposé de l'exponentielle du produit de 2 par x");
	});

	it('« et de » dès qu’un élément commence par un article', () => {
		expect(read('3a+5b+2')).toBe('la somme du produit de 3 par a, du produit de 5 par b et de 2');
		expect(read('2+3+x')).toBe('la somme de 2, 3 et x');
	});

	it('« à le » → « au »', () => {
		expect(read('y=3x')).toBe('y est égal au produit de 3 par x');
	});

	it("« à la », « à l' »", () => {
		expect(read('y=2+x')).toBe('y est égal à la somme de 2 et x');
		expect(read('y=-x')).toBe("y est égal à l'opposé de x");
	});
});

describe('lecture : accords dans une relation', () => {
	it('masculin : le produit … est égal à', () => {
		expect(read('3x=12')).toBe('le produit de 3 par x est égal à 12');
	});

	it('féminin : la somme … est égale à', () => {
		expect(read('2x+5=9')).toBe('la somme du produit de 2 par x et de 5 est égale à 9');
	});

	it('inégalités, au masculin et au féminin', () => {
		expect(read('3x<6')).toBe('le produit de 3 par x est strictement inférieur à 6');
		expect(read('2+x\\le 6')).toBe('la somme de 2 et x est inférieure ou égale à 6');
		expect(read('2+x>6')).toBe('la somme de 2 et x est strictement supérieure à 6');
		expect(read('5y\\ge 6')).toBe('le produit de 5 par y est supérieur ou égal à 6');
	});

	it('différent de, avec contraction', () => {
		expect(read('x\\neq 3y')).toBe('x est différent du produit de 3 par y');
	});

	it('encadrement : chaque membre est le sujet du suivant', () => {
		expect(read('1<2x<3')).toBe(
			'1 est strictement inférieur au produit de 2 par x, qui est strictement inférieur à 3'
		);
	});
});

describe('lecture : blocs, fonctions, racines', () => {
	it('un angle en degrés est lu comme une formule, sans mot', () => {
		const reading = readingOf(structureOf('90^\\circ'));
		expect(words(reading)).toEqual([]);
		expect(reading.segments).toHaveLength(1);
		expect(reading.segments[0].kind).toBe('formula');
	});

	it('cosinus, tangente, valeur absolue, exponentielle', () => {
		expect(read('\\cos(2x)')).toBe('le cosinus du produit de 2 par x');
		expect(read('\\tan x')).toBe('la tangente de x');
		expect(read('|3x|')).toBe('la valeur absolue du produit de 3 par x');
		// e = Euler (\exponentialE) : e^x est lu comme une puissance de e, volontairement
		// PAS « l'exponentielle de x » (réservé à la notation \exp)
		// Exposant composé (Q16) : « la puissance 2x de e »
		expect(read('e^{2x}')).toBe('la puissance 2 x de \\exponentialE');
	});

	it('racine cubique, puissance d’un sinus', () => {
		expect(read('\\sqrt[3]{5x}')).toBe('la racine cubique du produit de 5 par x');
		expect(read('\\sin^2 x')).toBe('le carré du sinus de x');
	});

	it('autre puissance d’une fonction (`sin⁻¹`, réciproque ou inverse ?) : en formule', () => {
		expect(read('\\sin^{-1}(x)')).toBe('\\sin^{−1}\\left( x \\right)');
	});

	it('Q16 : base composée (−1 entre parenthèses) : « la puissance n de » ; base simple : forme simple', () => {
		expect(read('(-1)^n')).toBe('la puissance n de −1');
		expect(read('-1^n')).toBe("l'opposé de 1 puissance n");
		expect(read('(-3)^2')).toBe('le carré de −3');
	});

	it('image par une fonction, argument composé', () => {
		expect(read('g(3x+1)')).toBe("l'image de la somme du produit de 3 par x et de 1 par g");
	});
});

describe('lecture : mots du dictionnaire', () => {
	it('chaque mot porte la clé de son entrée (termId du lexique)', () => {
		const keys = (latex: string) =>
			words(readingOf(structureOf(latex))).map((w) => w.kind === 'word' && w.key);
		expect(keys('2+3y')).toEqual(['somme', 'produit']);
		expect(keys('5-3')).toEqual(['différence']);
		expect(keys('7\\div x')).toEqual(['quotient']);
		expect(keys('(2x)^2')).toEqual(['carré (puissance)', 'produit']);
		expect(keys('y^3')).toEqual(['cube (puissance)']);
		expect(keys('y^5')).toEqual(['puissance']);
		expect(keys('\\sqrt{2}')).toEqual(['racine carrée']);
		expect(keys('f(2x)')).toEqual(['image (fonction)', 'produit']);
		expect(keys('\\tan x')).toEqual(['tangente (trigonométrie)']);
		expect(keys('\\ln x')).toEqual(['logarithme']);
		expect(keys('-2a')).toEqual(['opposé', 'produit']);
		expect(keys('2a=6')).toEqual(['produit', 'égal']);
	});
});

describe('lecture : puissances (Q16, Q17)', () => {
	it.each([
		['(a+b)^4', 'la puissance 4 de la somme de a et b'],
		['(2x)^5', 'la puissance 5 du produit de 2 par x'],
		['(x+1)^{-1}', 'la puissance −1 de la somme de x et 1'],
		['\\left(\\frac12\\right)^n', 'la puissance n du quotient de 1 par 2'],
		['2^{n+1}', 'la puissance n + 1 de 2'],
		// Exposant lettre seule : forme simple (correction du brief, 2026-10-11)
		['x^n', 'x puissance n'],
		['e^x', '\\exponentialE puissance x'],
		['3q^n', 'le produit de 3 par q puissance n'],
		['(5y)^n', 'la puissance n du produit de 5 par y'],
		['(a+b)^4=1', 'la puissance 4 de la somme de a et b est égale à 1'],
		['x^4', 'x puissance 4'],
		['x^{-1}', 'x puissance −1'],
		['(a+b)^2', 'le carré de la somme de a et b'],
		['3\\times10^{2}', 'le produit de 3 par 10 puissance 2'],
		['10^{3}', '10 puissance 3'],
		['10^{-3}', '10 puissance −3'],
		['5^{3}', 'le cube de 5']
	])('%s → %s', (latex, expected) => {
		expect(read(latex)).toBe(expected);
	});

	it('le mot « puissance » désigne la puissance, l’exposant sa formule', () => {
		const structure = structureOf('(a+b)^4');
		const reading = readingOf(structure);
		const power = wordSegment(reading, 'puissance');
		if (power.kind !== 'word') throw new Error('mot attendu');
		expect(power.key).toBe('puissance');
		expect(nodeOf(structure, power).kind).toBe('power');
		expect(nodeOf(structure, formulaSegment(reading, '4')).role).toBe('exponent');
	});
});

describe('lecture : « par » emboîtés (Q20)', () => {
	it.each([
		[
			'\\frac{a}{b}\\times\\frac{c}{d}',
			'le produit du quotient de a par b et du quotient de c par d'
		],
		['(3y)\\times(2x)', 'le produit du produit de 3 par y et du produit de 2 par x'],
		// Produit aplati par la structure : trois facteurs 3, y, (2x)
		['3y\\times(2x)', 'le produit de 3, de y et du produit de 2 par x'],
		['5\\times\\frac{2}{7}', 'le produit de 5 et du quotient de 2 par 7'],
		['2\\times\\frac{a}{b}\\times c', 'le produit de 2, du quotient de a par b et de c'],
		[
			'\\frac{2x+1}{x-3}',
			'le quotient dont le numérateur est la somme du produit de 2 par x et de 1 et le dénominateur la différence de x et 3'
		],
		['2x\\div3', 'le quotient dont le numérateur est le produit de 2 par x et le dénominateur 3'],
		[
			'\\frac{1}{4y}',
			'le quotient dont le numérateur est 1 et le dénominateur le produit de 4 par y'
		],
		['3y', 'le produit de 3 par y'],
		['\\frac{a}{b}', 'le quotient de a par b'],
		['\\frac{x+1}{x-1}', 'le quotient de la somme de x et 1 par la différence de x et 1']
	])('%s → %s', (latex, expected) => {
		expect(read(latex)).toBe(expected);
	});

	it('« numérateur » et « dénominateur » désignent leurs sous-expressions', () => {
		const structure = structureOf('\\frac{2x+1}{x-3}');
		const reading = readingOf(structure);
		const numerator = wordSegment(reading, 'numérateur');
		const denominator = wordSegment(reading, 'dénominateur');
		expect(numerator.kind === 'word' && numerator.key).toBe('numérateur');
		expect(denominator.kind === 'word' && denominator.key).toBe('dénominateur');
		expect(nodeOf(structure, numerator).role).toBe('numerator');
		expect(nodeOf(structure, denominator).role).toBe('denominator');
	});
});

describe('lecture : clés des mots et dictionnaire de référence', () => {
	/**
	 * Le dictionnaire d'une base fraîche : la référence figée, puis les 4 mots de la
	 * lecture ajoutés le 2026-10-11 (migration 20261016090300_dictionnaire_mots_lecture).
	 */
	const DICTIONARY = [...REFERENCE_DICTIONARY, ...READING_WORDS_2026_10_11];

	it('chaque clé existe dans le dictionnaire', () => {
		const ids = new Set(DICTIONARY.map(termId));
		const missing = [...new Set(READING_WORD_KEYS)].filter((key) => !ids.has(key));
		expect(missing).toEqual([]);
	});

	it("racine d'indice n : clé dédiée, pas la fiche de la racine carrée", () => {
		const reading = readingOf(structureOf('\\sqrt[4]{x}'));
		expect(readingPlainText(reading)).toBe("la racine d'indice 4 de x");
		expect(words(reading).map((w) => w.kind === 'word' && w.key)).toEqual(['racine n-ième']);
	});
});

describe('lecture : rattachement aux sous-expressions', () => {
	it('2 + 3y : somme, produit, facteurs', () => {
		const structure = structureOf('2+3y');
		const reading = readingOf(structure);
		expect(nodeOf(structure, wordSegment(reading, 'somme')).kind).toBe('sum');
		expect(wordSegment(reading, 'somme').node).toBe(structure.root);
		const product = nodeOf(structure, wordSegment(reading, 'produit'));
		expect(product.kind).toBe('product');
		expect(stripMarkers(product.latex)).toBe('3 y');
		const three = nodeOf(structure, formulaSegment(reading, '3'));
		expect(three.kind).toBe('number');
		expect(three.parent).toBe(product.id);
		expect(nodeOf(structure, formulaSegment(reading, '2')).role).toBe('term');
	});

	it('2x + 3 = 7 : le verbe à la relation, 7 au membre de droite', () => {
		const structure = structureOf('2x+3=7');
		const reading = readingOf(structure);
		expect(nodeOf(structure, wordSegment(reading, 'égale')).kind).toBe('relation');
		expect(nodeOf(structure, formulaSegment(reading, '7')).role).toBe('right-side');
		expect(nodeOf(structure, wordSegment(reading, 'somme')).role).toBe('left-side');
	});

	it("−3y + x : « l'opposé » désigne le terme 3y", () => {
		const structure = structureOf('-3y+x');
		const reading = readingOf(structure);
		const opposite = nodeOf(structure, wordSegment(reading, 'opposé'));
		expect(opposite.role).toBe('term');
		expect(stripMarkers(opposite.latex)).toBe('3 y');
	});

	it('5 − 3 + x : « −3 » désigne le terme 3', () => {
		const structure = structureOf('5-3+x');
		const reading = readingOf(structure);
		const three = nodeOf(structure, formulaSegment(reading, '-3'));
		expect(three.kind).toBe('number');
		expect(three.role).toBe('term');
	});

	it('« du » appartient au groupe introduit, « de » à celui qui le contient', () => {
		const structure = structureOf('2+3y');
		const reading = readingOf(structure);
		const du = reading.segments.find((s) => s.kind === 'text' && s.text.includes('du'));
		if (!du) throw new Error('« du » absent');
		expect(nodeOf(structure, du).kind).toBe('product');
	});

	it("lecture d'une sous-expression survolée", () => {
		const structure = structureOf('2+3y');
		const product = structure.nodes.find((n) => n.kind === 'product');
		if (!product) throw new Error('produit absent');
		expect(readingPlainText(readingOf(structure, product.id))).toBe('le produit de 3 par y');
		expect(readingOf(structure, product.id).node).toBe(product.id);
	});

	it('deux morceaux de texte voisins du même groupe sont fusionnés', () => {
		const reading = readingOf(structureOf('-a'));
		for (let i = 1; i < reading.segments.length; i++) {
			const [a, b] = [reading.segments[i - 1], reading.segments[i]];
			expect(a.kind === 'text' && b.kind === 'text' && a.node === b.node).toBe(false);
		}
	});
});
