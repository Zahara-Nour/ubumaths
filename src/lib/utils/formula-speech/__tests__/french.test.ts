/**
 * Lecture en français d'une formule (E32)
 *
 * Ce qu'entend un élève qui utilise un lecteur d'écran. Les tournures ont été
 * validées par David le 2026-11-24 : une forme simple se dit d'un trait
 * (« pi sur 12 »), une forme composée annonce son début et sa fin.
 */
import { describe, expect, it } from 'vitest';
import { speakLatexInFrench } from '../french.ts';

const cas: [latex: string, lecture: string][] = [
	// Nombres
	['12', '12'],
	['3{,}5', '3 virgule 5'],
	['12\\,345', '12345'],
	['-3', 'moins 3'],
	['50\\%', '50 pour cent'],
	// Opérations et relations
	['x+1', 'x plus 1'],
	['2\\times 3', '2 fois 3'],
	['6\\div 2', '6 divisé par 2'],
	['3x-1=0', '3 x moins 1 égale 0'],
	['x\\neq 2', 'x différent de 2'],
	['x\\leqslant 2', 'x inférieur ou égal à 2'],
	['x\\geq 2', 'x supérieur ou égal à 2'],
	['x<2', 'x inférieur à 2'],
	['\\pi\\approx 3{,}14', 'pi environ égal à 3 virgule 14'],
	['a\\iff b', 'a équivaut à b'],
	['a\\Rightarrow b', 'a implique b'],
	['x=\\pm 2', 'x égale plus ou moins 2'],
	// Fractions
	['\\frac{\\pi}{12}', 'pi sur 12'],
	['\\dfrac{3}{4}', '3 sur 4'],
	['\\frac{-1}{2}', 'moins 1 sur 2'],
	['\\frac{x+1}{x-2}', 'fraction, x plus 1, sur, x moins 2, fin de fraction'],
	// Puissances, indices, racines
	['x^2', 'x au carré'],
	['x^3', 'x au cube'],
	['x^n', 'x puissance n'],
	['\\mathbb{R}^*', 'R étoile'],
	['\\mathbb{R}_{+}^{*}', 'R plus étoile'],
	['1^{er}', '1er'],
	['2^{\\text{nde}}', '2nde'],
	['\\frac{2}{3}x', '2 sur 3, x'],
	['\\frac{1}{2}+x', '1 sur 2 plus x'],
	['10^{-3}', '10 puissance moins 3'],
	['2^{n+1}', '2 puissance, n plus 1, fin de puissance'],
	['u_n', 'u indice n'],
	['u_{n+1}', 'u indice, n plus 1, fin d’indice'],
	['x_1^2', 'x indice 1 au carré'],
	['\\sqrt{2}', 'racine carrée de 2'],
	['\\sqrt{x+1}', 'racine carrée de, x plus 1, fin de racine'],
	['\\sqrt[3]{8}', 'racine cubique de 8'],
	['30^\\circ', '30 degrés'],
	['30°', '30 degrés'],
	// Fonctions
	["f'(x)", 'f prime de x'],
	['f(x)=2x', 'f de x égale 2 x'],
	['f(x+1)', 'f de, ouvrir la parenthèse, x plus 1, fermer la parenthèse'],
	['\\ln(x)', 'logarithme népérien de x'],
	['\\cos x', 'cosinus de x'],
	['\\ln 2', 'logarithme népérien de 2'],
	['\\cos(2x)', 'cosinus de, ouvrir la parenthèse, 2 x, fermer la parenthèse'],
	['f(x)^2', 'f, ouvrir la parenthèse, x, fermer la parenthèse, au carré'],
	["f''(x)", 'f seconde de x'],
	['e^x', 'e puissance x'],
	['\\exponentialE^{2x}', 'e puissance, 2 x, fin de puissance'],
	['2(x+1)', '2, ouvrir la parenthèse, x plus 1, fermer la parenthèse'],
	[
		'\\left(\\frac{1}{2}\\right)^n',
		'ouvrir la parenthèse, 1 sur 2, fermer la parenthèse, puissance n'
	],
	// Ensembles et intervalles
	['x\\in\\mathbb{R}', 'x appartient à R'],
	['x\\notin\\mathbb{N}', 'x n’appartient pas à N'],
	['[2;5[', 'intervalle fermé en 2, ouvert en 5'],
	['\\left]-\\infty;3\\right]', 'intervalle ouvert en moins l’infini, fermé en 3'],
	[
		'x\\in[0;1]\\cup]2;+\\infty[',
		'x appartient à intervalle fermé en 0, fermé en 1, union intervalle ouvert en 2, ouvert en plus l’infini'
	],
	['A\\cup B', 'A union B'],
	['A\\cap B', 'A inter B'],
	['\\varnothing', 'ensemble vide'],
	// Géométrie
	['\\vec{AB}', 'vecteur A B'],
	['\\overrightarrow{AB}', 'vecteur A B'],
	['\\vec{u}\\cdot\\vec{v}', 'vecteur u scalaire vecteur v'],
	['\\widehat{ABC}=30^\\circ', 'angle A B C égale 30 degrés'],
	['[AB]', 'segment A B'],
	['[AB)', 'demi-droite A B'],
	['A(2;3)', 'A, ouvrir la parenthèse, 2 point-virgule 3, fermer la parenthèse'],
	['\\begin{pmatrix}1\\\\2\\end{pmatrix}', 'matrice, 1, puis, 2, fin de matrice'],
	['\\overline{A}', 'A barre'],
	[
		'(AB)\\perp(CD)',
		'ouvrir la parenthèse, A B, fermer la parenthèse, perpendiculaire à, ouvrir la parenthèse, C D, fermer la parenthèse'
	],
	// Analyse
	['\\lim_{x\\to+\\infty}f(x)', 'limite quand x tend vers plus l’infini de f de x'],
	['\\lim\\limits_{x\\to 0^+}\\frac{1}{x}', 'limite quand x tend vers 0 plus de 1 sur x'],
	['\\sum_{k=1}^{n}k', 'somme pour k égale 1 jusqu’à n de k'],
	['\\int_0^1 x^2\\,dx', 'intégrale de 0 à 1 de x au carré d x'],
	['\\binom{n}{k}', 'k parmi n'],
	// Texte, couleurs, unités
	['\\text{si } x\\geq 0', 'si x supérieur ou égal à 0'],
	['12\\,\\mathrm{cm}^2', '12 cm au carré'],
	['\\textcolor{red}{x}+1', 'x plus 1'],
	['\\placeholder[a]{}', 'case à compléter'],
	['\\begin{aligned}a&=b\\\\&=c\\end{aligned}', 'a égale b, puis, égale c'],
	['\\text{<b>}x', 'b x'],
	['\\displaystyle\\frac{1}{2}', '1 sur 2'],
	// Systèmes
	[
		'\\begin{cases}x+y=1\\\\x-y=3\\end{cases}',
		'système, x plus y égale 1, puis, x moins y égale 3, fin du système'
	],
	// Lettres grecques
	['\\alpha+\\beta', 'alpha plus bêta'],
	['\\Delta=b^2-4ac', 'delta égale b au carré moins 4 a c']
];

describe('speakLatexInFrench', () => {
	it.each(cas)('%s → « %s »', (latex, lecture) => {
		expect(speakLatexInFrench(latex)).toBe(lecture);
	});

	it('un symbole inconnu est dit par son nom, jamais en anglais ni avec une balise', () => {
		const lecture = speakLatexInFrench('a\\bowtie b');
		expect(lecture).toBe('a bowtie b');
	});

	it('aucune lecture ne contient de balise ni de commande', () => {
		for (const [latex] of cas) {
			expect(speakLatexInFrench(latex)).not.toMatch(/[<>\\{}]/);
		}
	});

	it('une formule mal formée ne lève pas', () => {
		expect(() => speakLatexInFrench('\\frac{1}{')).not.toThrow();
		expect(() => speakLatexInFrench('x^')).not.toThrow();
		expect(() => speakLatexInFrench('}')).not.toThrow();
		expect(speakLatexInFrench('')).toBe('');
	});

	// Ce code tourne sur toutes les pages, sur du contenu écrit par des élèves (chat)
	it.each([
		['accolades jamais fermées', '{'.repeat(50)],
		['exposants jamais fermés', 'x^{'.repeat(60)],
		// Lue deux fois par niveau, la tour d'exposants coûtait 2^n lectures
		['tour d’exposants', `${'x^{'.repeat(39)}2${'}'.repeat(39)}`],
		['fractions imbriquées', `${'\\frac{'.repeat(39)}x${'}{y}'.repeat(39)}`],
		['accolades très imbriquées', `${'{'.repeat(500)}x${'}'.repeat(500)}`],
		['commandes nues en chaîne', '\\frac'.repeat(5000)],
		['racines nues en chaîne', '\\sqrt'.repeat(700)],
		['parenthèses de fonction en chaîne', 'f('.repeat(20000)],
		['formule immense', '1+x^2-'.repeat(40000)]
	])('entrée démesurée (%s) : ni exception, ni boucle, ni attente', (_nom, latex) => {
		const start = performance.now();
		const lecture = speakLatexInFrench(latex);
		expect(performance.now() - start).toBeLessThan(500);
		expect(lecture).not.toMatch(/[<>\\{}]/);
	});
});
