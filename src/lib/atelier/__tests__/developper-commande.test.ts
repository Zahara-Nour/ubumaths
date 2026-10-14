/**
 * `.développer` — une commande que l'atelier sert lui-même, comme `.factoriser`
 * (phase 0 `docs/wip/atelier-developper-phase0.md`, décisions de David du
 * 2026-10-14).
 *
 * PR 1 : la réponse. PR 2 : le « Comment ? » (section E de la phase 0) — les
 * étapes que rendait l'intention `developper` n'étaient pas montrables (produits
 * collés « 2x1 », la même ligne jusqu'à 13 fois, distribution cachée) ; elles
 * sont rédigées par `pedagogical-simplify/expand-steps.ts`. Les tests lisent ce
 * que l'élève VOIT : le titre et l'image (la ligne « = … » sous le titre).
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { expandExpression } from '../expand';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string, s: CalcSession = session()) {
	return runInput(s, input);
}

function commande(input: string, s: CalcSession = session()) {
	const result = run(input, s);
	expect(result.kind, `« ${input} » n'a pas rendu une commande`).toBe('commande');
	return result.kind === 'commande' ? result : null!;
}

function refus(input: string): string {
	const result = run(input);
	expect(result.kind, `« ${input} » n'a pas été refusé`).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

/**
 * Les deux lignes d'une étape : l'expression de départ (en bleu) et l'image,
 * la ligne « = … » que l'élève lit sous le titre.
 */
function linesOf(step: RenderedStep): { before: string; image: string } {
	const latex = step.expressionLatex ?? '';
	const match =
		/^\\begin\{aligned\}\n {2}\\textcolor\{blue\}\{(.*)\} & \\\\\n {2}= (.*)\n\\end\{aligned\}$/.exec(
			latex
		);
	expect(match, `étape illisible : ${latex}`).not.toBeNull();
	return { before: match![1], image: match![2] };
}

/** Les étapes d'une ligne « .développer … » : [titre, image], dans l'ordre. */
function etapes(expression: string, s: CalcSession = session()): [string, string][] {
	const result = commande(`.développer ${expression}`, s);
	expect(result.steps, `« ${expression} » n'a pas d'étapes`).toBeDefined();
	return result.steps!.map((step) => [step.title, linesOf(step).image]);
}

/** La même chose, en version résumée. */
function resume(expression: string): [string, string][] {
	const result = commande(`.développer ${expression}`);
	expect(result.summary, `« ${expression} » n'a pas de résumé`).toBeDefined();
	return result.summary!.map((step) => [step.title, linesOf(step).image]);
}

/** Un nombre collé à une lettre ou à un autre nombre : `2 x 1`, `2 3` (règle de la section E). */
const GLUED_NUMBER = /(?:^|[^a-z\\{])[a-z] \d|\d \d/;

/** Les expressions du tableau B qui se rédigent, et quelques voisines. */
const EXPLAINED = [
	'(x+1)^2',
	'(x-3)^2',
	'(2x+5)^2',
	'(x+2)(x-2)',
	'(2x-1)(x+3)',
	'3(x-2)-(x+1)',
	'5-2(x-3)',
	'x(x-1)',
	'(3x-1)^2-(x+2)^2',
	'(x+1)(x+2)(x+3)',
	'(x+1)^3',
	'(a+b)^2',
	'a(x+b)',
	'e^x(x+1)',
	'(0,5x+1)^2',
	'(x/2+1)^2',
	'-(x+1)',
	'-(2x-3)',
	'-(x+1)(x-1)',
	'-2(x-4)',
	'(a-b)^2',
	'(x+a)(x-a)',
	'2(x+1)^2',
	'(x+1)^4'
];

describe('la commande existe et se découvre', () => {
	it('elle est au catalogue, juste après « factoriser », dans « Calculer »', () => {
		const catalog = commandCatalog(new WebReplEngine());
		const index = catalog.findIndex((c) => c.french === 'développer');

		expect(index, '« développer » absente du catalogue').toBeGreaterThan(-1);
		expect(catalog[index - 1].french).toBe('factoriser');
		expect(catalog[index].section).toBe('calculer');
	});

	it('son exemple marche vraiment', () => {
		const command = commandCatalog(new WebReplEngine()).find((c) => c.french === 'développer')!;

		expect(command.example).toBe('.développer (2x-1)(x+3)');
		expect(commande(command.example!).latex).toBe('2 x^2 + 5 x - 3');
	});

	it('sans accent et sous son nom moteur, la même réponse', () => {
		expect(commande('.developper (x+1)^2').latex).toBe('x^2 + 2 x + 1');
		expect(commande('.expand (x+1)^2').latex).toBe('x^2 + 2 x + 1');
	});

	it('elle n’est PAS envoyée au moteur, qui ne la connaît pas', () => {
		const result = commande('.développer (x+1)^2');

		expect(result.output).not.toContain('Unknown');
		expect(result.output).not.toContain('Error');
	});

	it('le « Comment ? » est là, avec sa version résumée (PR 2)', () => {
		const result = commande('.développer (2x-1)(x+3)');

		expect(result.steps).toBeDefined();
		expect(result.summary).toBeDefined();
	});
});

/**
 * Section E de la phase 0, validée par David le 2026-10-14 : deux règles pour
 * toutes — jamais deux lignes identiques de suite, un × entre deux facteurs dès
 * qu'un nombre suit une lettre ou un autre nombre.
 */
describe('« Comment ? » : les étapes rédigées (section E)', () => {
	it('(x+1)² : l’identité qui nomme a et b, puis chaque terme calculé', () => {
		expect(etapes('(x+1)^2')).toEqual([
			[
				'On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1',
				'x^2 + 2 \\times x \\times 1 + 1^2'
			],
			['On calcule chaque terme', 'x^2 + 2 x + 1']
		]);
	});

	it('(2x − 1)(x + 3) : la distribution, chaque produit, la réduction', () => {
		expect(etapes('(2x-1)(x+3)')).toEqual([
			[
				'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
				'2 x \\times x + 2 x \\times 3 - 1 \\times x - 1 \\times 3'
			],
			['On calcule chaque produit', '2 x^2 + 6 x - x - 3'],
			['On réduit', '2 x^2 + 5 x - 3']
		]);
	});

	it('3(x − 2) − (x + 1) : distribuer 3 et le signe − en une ligne, puis réduire', () => {
		expect(etapes('3(x-2)-(x+1)')).toEqual([
			[
				'On distribue 3, et le signe − devant la parenthèse change le signe de chaque terme',
				'3 x - 6 - x - 1'
			],
			['On réduit', '2 x - 7']
		]);
	});

	it('(3x − 1)² − (x + 2)² : les deux carrés, la parenthèse précédée d’un −, la réduction', () => {
		expect(etapes('(3x-1)^2-(x+2)^2')).toEqual([
			[
				'On développe chaque carré avec son identité remarquable',
				'9 x^2 - 6 x + 1 - \\left( x^2 + 4 x + 4 \\right)'
			],
			['On enlève la parenthèse précédée d’un −', '9 x^2 - 6 x + 1 - x^2 - 4 x - 4'],
			['On réduit', '8 x^2 - 10 x - 3']
		]);
	});

	it('(x + 1)³ : le carré fois la parenthèse, puis identité, distribution, réduction', () => {
		expect(etapes('(x+1)^3')).toEqual([
			['On écrit (x + 1)³ = (x + 1)²(x + 1)', '\\left( x + 1 \\right)^2 \\left( x + 1 \\right)'],
			[
				'On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1',
				'\\left( x^2 + 2 \\times x \\times 1 + 1^2 \\right) \\left( x + 1 \\right)'
			],
			['On calcule chaque terme', '\\left( x^2 + 2 x + 1 \\right) \\left( x + 1 \\right)'],
			[
				'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
				'x^2 \\times x + x^2 \\times 1 + 2 x \\times x + 2 x \\times 1 + 1 \\times x + 1 \\times 1'
			],
			['On calcule chaque produit', 'x^3 + x^2 + 2 x^2 + 2 x + x + 1'],
			['On réduit', 'x^3 + 3 x^2 + 3 x + 1']
		]);
	});

	it('exposant 4 ou plus : une seule étape, « On développe la puissance »', () => {
		expect(etapes('(x+1)^4')).toEqual([
			['On développe la puissance', 'x^4 + 4 x^3 + 6 x^2 + 4 x + 1']
		]);
	});

	it('la première ligne part de l’expression tapée, chaque étape de la précédente', () => {
		const steps = commande('.développer (2x-1)(x+3)').steps!;

		expect(steps[0].expressionLatex).toBe(
			'\\begin{aligned}\n  \\textcolor{blue}{\\left( 2 x - 1 \\right) \\left( x + 3 \\right)} & \\\\\n' +
				'  = 2 x \\times x + 2 x \\times 3 - 1 \\times x - 1 \\times 3\n\\end{aligned}'
		);
		for (let i = 1; i < steps.length; i++) {
			expect(linesOf(steps[i]).before).toBe(linesOf(steps[i - 1]).image);
		}
	});

	it('d’autres écritures du collège : un facteur, le signe −, une lettre, a² − b²', () => {
		expect(etapes('5-2(x-3)')).toEqual([
			['On distribue −2', '5 - 2 x + 6'],
			['On réduit', '-2 x + 11']
		]);
		expect(etapes('x(x-1)')).toEqual([['On distribue x', 'x^2 - x']]);
		expect(etapes('-(x+1)')).toEqual([['On enlève la parenthèse précédée d’un −', '-x - 1']]);
		expect(etapes('(x+2)(x-2)')).toEqual([
			['On reconnaît (a + b)(a − b) = a² − b², avec a = x et b = 2', 'x^2 - 2^2'],
			['On calcule chaque terme', 'x^2 - 4']
		]);
	});

	it('les décimaux des étapes suivent ceux de la réponse', () => {
		expect(etapes('(0,5x+1)^2')).toEqual([
			[
				'On reconnaît (a + b)² = a² + 2ab + b², avec a = 0,5x et b = 1',
				'\\left( 0{,}5 x \\right)^2 + 2 \\times 0{,}5 x \\times 1 + 1^2'
			],
			['On calcule chaque terme', '0{,}25 x^2 + x + 1']
		]);
	});
});

describe('les deux règles, sur le tableau B', () => {
	it.each(EXPLAINED)('%s : jamais deux images identiques de suite', (expression) => {
		const images = etapes(expression).map(([, image]) => image);

		for (let i = 1; i < images.length; i++) {
			expect(images[i], `${expression}, étape ${i + 1}`).not.toBe(images[i - 1]);
		}
		// Ni une première image identique à l'expression de départ
		const first = commande(`.développer ${expression}`).steps![0];
		expect(linesOf(first).image).not.toBe(linesOf(first).before);
	});

	it.each(EXPLAINED)('%s : la dernière image est la réponse de la ligne', (expression) => {
		const result = commande(`.développer ${expression}`);
		const steps = result.steps!;

		expect(linesOf(steps[steps.length - 1]).image).toBe(result.latex);
		const summary = result.summary ?? steps;
		expect(linesOf(summary[summary.length - 1]).image).toBe(result.latex);
	});

	it.each(EXPLAINED)('%s : aucun nombre collé à une lettre ou à un nombre', (expression) => {
		for (const [title, image] of etapes(expression)) {
			expect(image, title).not.toMatch(GLUED_NUMBER);
		}
	});

	it('en mode décimal, la dernière image est encore la réponse', () => {
		const s = session();
		run('.mode décimal', s);
		const result = commande('.développer (x/2+1)^2', s);
		const steps = result.steps!;

		expect(result.latex).toBe('0{,}25 x^2 + x + 1');
		expect(linesOf(steps[steps.length - 1]).image).toBe('0{,}25 x^2 + x + 1');
	});
});

describe('la version résumée : sans les lignes à × ni les « pourquoi »', () => {
	it('(x+1)² : l’identité donne directement les termes calculés', () => {
		expect(resume('(x+1)^2')).toEqual([
			['On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1', 'x^2 + 2 x + 1']
		]);
	});

	it('(2x − 1)(x + 3) : distribuer, puis réduire', () => {
		expect(resume('(2x-1)(x+3)')).toEqual([
			[
				'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
				'2 x^2 + 6 x - x - 3'
			],
			['On réduit', '2 x^2 + 5 x - 3']
		]);
	});

	it.each(EXPLAINED)('%s : jamais plus long, jamais un × ni un « pourquoi »', (expression) => {
		const result = commande(`.développer ${expression}`);
		const summary = result.summary ?? result.steps!;

		expect(summary.length).toBeLessThanOrEqual(result.steps!.length);
		for (const step of summary) {
			expect(step.explanation, step.title).toBeUndefined();
			expect(linesOf(step).image, step.title).not.toContain('\\times');
		}
	});

	it('la version détaillée dit le « pourquoi » de chaque étape', () => {
		const steps = commande('.développer (2x-1)(x+3)').steps!;

		expect(steps.every((step) => step.explanation !== undefined)).toBe(true);
	});

	it('une ligne à × de moins dans le résumé, partout où il y en a une', () => {
		for (const expression of ['(x+1)^2', '(2x-1)(x+3)', '(x+1)^3', '(x+1)(x+2)(x+3)']) {
			const result = commande(`.développer ${expression}`);

			expect(result.summary!.length, expression).toBeLessThan(result.steps!.length);
		}
	});
});

describe('ce qu’on ne sait pas expliquer ne s’affiche pas en étapes', () => {
	it('rien à développer : ni réponse ni étapes (1/(x+1))', () => {
		const result = commande('.développer 1/(x+1)');

		expect(result.latex).toBeUndefined();
		expect(result.steps).toBeUndefined();
		expect(result.summary).toBeUndefined();
	});

	it('une somme sous une fonction : la réponse, sans « Comment ? »', () => {
		const result = commande('.développer cos(2(x+1))');

		expect(result.latex).toBe('\\cos\\left( 2 x + 2 \\right)');
		expect(result.steps).toBeUndefined();
		expect(result.summary).toBeUndefined();
	});

	it('une fraction de sommes : la réponse, sans « Comment ? »', () => {
		// Le texte se lit `(x+1) · (x-1)/(x+2)` : une fraction EN FACTEUR, que la
		// rédaction ne sait pas encore mettre sur un seul trait
		const result = commande('.développer (x+1)(x-1)/(x+2)');

		expect(result.latex).toBe('\\dfrac{x^2 - 1}{x + 2}');
		expect(result.steps).toBeUndefined();
		expect(result.summary).toBeUndefined();
	});
});

describe('les réponses : développer ET réduire (tableau B)', () => {
	it.each([
		['(x+1)^2', 'x^2 + 2 x + 1'],
		['(x-3)^2', 'x^2 - 6 x + 9'],
		['(2x+5)^2', '4 x^2 + 20 x + 25'],
		['(x+2)(x-2)', 'x^2 - 4'],
		['(2x-1)(x+3)', '2 x^2 + 5 x - 3'],
		['3(x-2)-(x+1)', '2 x - 7'],
		['5-2(x-3)', '-2 x + 11'],
		['x(x-1)', 'x^2 - x'],
		['(3x-1)^2-(x+2)^2', '8 x^2 - 10 x - 3'],
		['(x+1)(x+2)(x+3)', 'x^3 + 6 x^2 + 11 x + 6'],
		['(x+1)^3', 'x^3 + 3 x^2 + 3 x + 1'],
		['(x+1)(x-1)/(x+2)', '\\dfrac{x^2 - 1}{x + 2}'],
		// Revue : le module rend 0 étape sur `-(…)` seul, et la ligne disait
		// « rien à développer » — un cas de collège
		['-(x+1)', '-x - 1'],
		['-(2x-3)', '-2 x + 3'],
		['-(x+1)(x-1)', '-x^2 + 1']
	])('%s → %s', (expression, attendu) => {
		expect(commande(`.développer ${expression}`).latex).toBe(attendu);
	});

	it('la forme texte suit (historique, export)', () => {
		expect(commande('.développer (2x-1)(x+3)').output).toBe('2x^2+5x-3');
	});
});

describe('l’ordre des termes : puissances décroissantes de x, sinon alphabétique', () => {
	it.each([
		// Aujourd'hui `2ab + a² + b²` : l'ordre du module, pas celui du tableau
		['(a+b)^2', 'a^2 + 2 a b + b^2'],
		['(a-b)^2', 'a^2 - 2 a b + b^2'],
		// Aujourd'hui `ab + ax` : les autres lettres sont des coefficients de x
		['a(x+b)', 'a x + a b'],
		['(x+y)^2', 'x^2 + 2 x y + y^2'],
		['(x+a)(x-a)', 'x^2 - a^2']
	])('%s → %s', (expression, attendu) => {
		expect(commande(`.développer ${expression}`).latex).toBe(attendu);
	});

	it('un facteur qui n’est pas une puissance de x ne dérange pas l’ordre', () => {
		expect(commande('.développer e^x(x+1)').latex).toBe('x \\exponentialE^x + \\exponentialE^x');
		expect(commande('.développer sqrt(x)(sqrt(x)+1)').latex).toBe('x + \\sqrt{x}');
	});

	it('un terme sans degré : l’ordre du module, pas celui du manuel', () => {
		// Décision de revue du 2026-10-14 (PR 2) : l'ordre du tableau B ne vaut que
		// pour une somme dont TOUS les termes sont des monômes. Dès qu'un terme n'a
		// pas de degré (eˣ, √x, sin x…), le comparer aux monômes n'a pas de sens :
		// la PR 1 rangeait `√(x+1)` après les monômes, on garde l'ordre du module.
		expect(commande('.développer (x+1)^2+sqrt(1+x)').latex).toBe('x^2 + 2 x + \\sqrt{x + 1} + 1');
		expect(commande('.développer (2sqrt(x)+1)^2').latex).toBe('4 x + 4 \\sqrt{x} + 1');
		expect(commande('.développer (e^x+e^(-x))^2').latex).toBe(
			'\\exponentialE^{2 x} + \\exponentialE^{-2 x} + 2'
		);
	});

	it('les lettres indicées comptent comme des lettres', () => {
		expect(commande('.développer (x_1+x_2)^2').latex).toBe('x_1^2 + 2 x_1 x_2 + x_2^2');
	});
});

describe('revue de la PR 2 : des titres et des « pourquoi » qui disent vrai', () => {
	it('sans degré, l’ordre du module : pas d’étape « On ordonne les termes »', () => {
		for (const expression of ['(e^x+e^(-x))^2', '(2sqrt(x)+1)^2']) {
			const result = commande(`.développer ${expression}`);
			const titles = result.steps!.map((step) => step.title);

			expect(titles, expression).not.toContain('On ordonne les termes');
			expect(linesOf(result.steps![result.steps!.length - 1]).image, expression).toBe(result.latex);
		}
	});

	it('« On ordonne les termes » dit quel ordre : puissances de x, sinon alphabétique', () => {
		const withX = commande('.développer 1+x(x+1)').steps!;
		const withoutX = commande('.développer (b+a)^2').steps!;

		expect(withX[withX.length - 1].title).toBe('On ordonne les termes');
		expect(withX[withX.length - 1].explanation).toContain('puissances décroissantes de x');
		expect(withoutX[withoutX.length - 1].title).toBe('On ordonne les termes');
		expect(withoutX[withoutX.length - 1].explanation).toContain('ordre alphabétique');
	});

	it('le titre d’identité ne nomme a et b que si l’expression n’a ni a ni b', () => {
		expect(etapes('(a-2b)^2')[0][0]).toBe('On reconnaît (a − b)² = a² − 2ab + b²');
		expect(etapes('(b+a)^2')[0][0]).toBe('On reconnaît (a + b)² = a² + 2ab + b²');
		expect(etapes('(x+a)(x-a)')[0][0]).toBe('On reconnaît (a + b)(a − b) = a² − b²');
		expect(etapes('(2x+5)^2')[0][0]).toBe(
			'On reconnaît (a + b)² = a² + 2ab + b², avec a = 2x et b = 5'
		);
	});

	it('un facteur devant les parenthèses : « la première parenthèse », pas « le premier facteur »', () => {
		const title =
			'On distribue : chaque terme de la première parenthèse multiplie chaque terme de la seconde';

		expect(etapes('x(x-1)(x+2)')[0]).toEqual([
			title,
			'x \\left( x \\times x + x \\times 2 - 1 \\times x - 1 \\times 2 \\right)'
		]);
		expect(etapes('2(x+1)(x+2)')[0][0]).toBe(title);
	});

	it('−(−(x + 1)) : deux signes − se compensent, sans parler d’un +', () => {
		const [step] = commande('.développer -(-(x+1))').steps!;

		expect(step.title).toBe('On enlève les parenthèses : deux signes − se compensent');
		expect(step.explanation).toContain('−(−a) = a');
		expect(step.explanation).not.toContain('+');
	});

	it('0(x + 1) : la réponse 0, sans étape « 0 + 0 »', () => {
		const result = commande('.développer 0(x+1)');

		expect(result.latex).toBe('0');
		expect(result.steps).toBeUndefined();
	});

	it('« On réduit » seulement quand des termes semblables se regroupent', () => {
		expect(etapes('2(x+1)+y/2')).toEqual([
			['On distribue 2', '2 x + 2 + \\dfrac{y}{2}'],
			[
				'On écrit chaque terme avec son coefficient, et on ordonne les termes',
				'2 x + \\dfrac{1}{2} y + 2'
			]
		]);
		// Un terme calculé, pas un coefficient sorti d'un quotient
		expect(etapes('(2x)^2')).toEqual([['On calcule chaque terme', '4 x^2']]);
	});

	it('en mode décimal, a et b s’écrivent dans le titre comme dans l’image', () => {
		const s = session();
		run('.mode décimal', s);

		expect(etapes('(x-1/2)^2', s)).toEqual([
			[
				'On reconnaît (a − b)² = a² − 2ab + b², avec a = x et b = 0,5',
				'x^2 - 2 \\times x \\times 0{,}5 + \\left( 0{,}5 \\right)^2'
			],
			['On calcule chaque terme', 'x^2 - x + 0{,}25']
		]);
	});
});

/**
 * Comme `.limite` (décision de David du 2026-10-06, étendue à `.développer` le
 * 2026-10-14) : la réponse s'écrit comme l'élève a écrit. Un décimal tapé, ou
 * le mode décimal, donne des décimaux ; sinon des fractions.
 */
describe('les décimaux : la réponse s’écrit comme l’élève a écrit', () => {
	it('un décimal tapé donne des décimaux, même en mode exact', () => {
		const result = commande('.développer (0,5x+1)^2');

		expect(result.latex).toBe('0{,}25 x^2 + x + 1');
		expect(result.output).toBe('0,25x^2+x+1');
	});

	it('des fractions tapées en mode exact donnent des fractions', () => {
		expect(commande('.développer (x/2+1)^2').latex).toBe('\\dfrac{1}{4} x^2 + x + 1');
	});

	it('le mode décimal donne des décimaux, même pour des fractions tapées', () => {
		const s = session();
		run('.mode décimal', s);

		expect(commande('.développer (x/2+1)^2', s).latex).toBe('0{,}25 x^2 + x + 1');
		expect(commande('.développer (0,5x+1)^2', s).latex).toBe('0{,}25 x^2 + x + 1');
	});

	it('une fraction sans écriture décimale finie reste une fraction', () => {
		const s = session();
		run('.mode décimal', s);

		// 1/9 n'a pas d'écriture décimale finie : un arrondi ferait d'une
		// égalité une approximation
		expect(commande('.développer (x/3+1)^2', s).latex).toBe(
			'\\dfrac{1}{9} x^2 + \\dfrac{2}{3} x + 1'
		);
		expect(commande('.développer (0,5x+1/3)^2').latex).toBe(
			'0{,}25 x^2 + \\dfrac{1}{3} x + \\dfrac{1}{9}'
		);
	});
});

describe('les noms d’objets', () => {
	it('développer f et développer f(x) : l’expression de la carte', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: '(x+1)^2' });

		expect(commande('.développer f', s).latex).toBe('x^2 + 2 x + 1');
		expect(commande('.développer f(x)', s).latex).toBe('x^2 + 2 x + 1');
	});

	it('une valeur de l’atelier est remplacée', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: '3' });

		expect(commande('.développer a(x+2)', s).latex).toBe('3 x + 6');
	});
});

describe('rien à développer : une réponse, pas une ligne rouge (C)', () => {
	it.each(['x^2+1', 'x^2+2x+1', '3x', '1/2x+3', 'sqrt(2)x+1', 'x_1+x_2'])(
		'%s est déjà développée et réduite',
		(expression) => {
			const result = commande(`.développer ${expression}`);

			expect(result.output).toContain('est déjà développée et réduite');
			expect(result.latex).toBeUndefined();
		}
	);

	it('le message cite l’expression telle que l’élève l’a tapée', () => {
		// Revue : `toCustom` écrivait « {1/2}x+3 », accolades comprises
		expect(commande('.développer 1/2x+3').output).toBe(
			'« 1/2x+3 » est déjà développée et réduite.'
		);
	});

	it.each(['1/(x+1)', '(x+1)^(-1)', 'sqrt(x+1)'])('%s : rien à développer', (expression) => {
		const result = commande(`.développer ${expression}`);

		expect(result.output).toContain('Il n’y a rien à développer dans');
		expect(result.latex).toBeUndefined();
	});

	it('une somme dans un exposant : « je ne sais pas », jamais une réponse mal écrite', () => {
		// Revue : la réponse affichait `e^{x^2 + 2 x 1 + 1^2}`, produit collé et
		// puissance non calculée — le défaut des étapes passé dans la réponse
		for (const expression of ['e^((x+1)^2)', '2^((x+1)^2)']) {
			const result = commande(`.développer ${expression}`);

			expect(result.output, expression).toBe(`Je ne sais pas développer « ${expression} ».`);
			expect(result.latex, expression).toBeUndefined();
		}
	});

	it('un résultat trop long est refusé avant le calcul, qui figerait la page', () => {
		// Revue : `(x+1)^2000` prenait 5 s, `(x+y+z+1)^25` 15 s
		for (const expression of ['(x+1)^2000', '(x+y+z+1)^25']) {
			const result = commande(`.développer ${expression}`);

			expect(result.output, expression).toContain('le calcul serait trop long');
			expect(result.latex, expression).toBeUndefined();
		}
		// En deçà, la réponse
		expect(commande('.développer (x+1)^100').latex).toMatch(/^x\^\{100\} \+ 100 x\^\{99\}/);
	});

	it('(x+1)^n : l’exposant n’est pas un nombre', () => {
		const result = commande('.développer (x+1)^n');

		expect(result.output).toContain('Je ne sais pas développer');
		expect(result.output).toContain('l’exposant n’est pas un nombre');
		expect(result.latex).toBeUndefined();
	});
});

describe('les refus, en français (D)', () => {
	it('sans expression : un exemple à recopier', () => {
		const message = refus('.développer');

		expect(message).toContain('Il manque l’expression à développer');
		expect(message).toContain('.développer (2x-1)(x+3)');
	});

	it('une équation : renvoi vers résoudre', () => {
		const message = refus('.développer (x+1)^2=4');

		expect(message).toContain('On développe une expression, pas une équation');
		expect(message).toContain('.résoudre (x+1)^2=4');
	});

	it('une inéquation : pareil', () => {
		const message = refus('.développer 2(x+1)<7');

		expect(message).toContain('pas une inéquation');
		expect(message).toContain('.résoudre 2(x+1)<7');
	});

	it('une liste n’est pas une expression qu’on développe', () => {
		const s = session();
		s.atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		const result = run('.développer L', s);

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toBe(
			'« L » n’est pas une expression qu’on sait développer.'
		);
	});

	it('une saisie illisible', () => {
		expect(refus('.développer ###')).toBe(
			'« ### » n’est pas une expression qu’on sait développer.'
		);
	});
});

describe('la fonction, hors de la commande', () => {
	it('elle ne jette jamais', () => {
		for (const entree of ['', '   ', '###', '2x+1<7', 'x=3', 'n’importe quoi', '(((', '[1;2]']) {
			expect(() => expandExpression(entree, 'exact'), entree).not.toThrow();
		}
	});
});
