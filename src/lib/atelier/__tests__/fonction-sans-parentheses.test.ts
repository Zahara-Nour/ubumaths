/**
 * V59 — une fonction usuelle écrite SANS parenthèses (`ln x`, `sin x`) se lit
 * l·n·x, s·i·n·x : un produit de lettres, sans erreur. Décision de David
 * (2026-10-06, `bareFunctionName`) : on la REFUSE partout dans l'atelier, avec
 * le même message, qui cite ce que l'élève a tapé.
 *
 * `ln(x)`, `\ln x` (LaTeX, clavier MathLive) et `l n` (un produit écrit avec
 * une espace) restent lus.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { parseDefinition, type Provenance } from '../parse';

function session(...setup: string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function refusalOf(text: string, s: CalcSession = session(), provenance?: Provenance): string {
	const result = runInput(s, text, provenance);
	expect(result.kind).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

describe('une fonction usuelle sans parenthèses est refusée, avec ce qui a été tapé', () => {
	it.each([
		['ln x', '« ln x » : écris ln(x) avec des parenthèses.'],
		['sin x', '« sin x » : écris sin(x) avec des parenthèses.'],
		['cos x', '« cos x » : écris cos(x) avec des parenthèses.'],
		['tan x', '« tan x » : écris tan(x) avec des parenthèses.'],
		['exp x', '« exp x » : écris exp(x) avec des parenthèses.'],
		['sqrt x', '« sqrt x » : écris sqrt(x) avec des parenthèses.'],
		['log x', '« log x » : écris log(x) avec des parenthèses.'],
		// Le fragment fautif seulement, et son argument tel quel
		['ln x + 1', '« ln x » : écris ln(x) avec des parenthèses.'],
		['2 ln x', '« ln x » : écris ln(x) avec des parenthèses.'],
		['ln 2x', '« ln 2x » : écris ln(2x) avec des parenthèses.'],
		['ln 2', '« ln 2 » : écris ln(2) avec des parenthèses.'],
		['sin^2 x', '« sin^2 x » : écris sin^2(x) avec des parenthèses.'],
		['e^ln x', '« ln x » : écris ln(x) avec des parenthèses.']
	])('ligne de calcul « %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it.each([
		'.évaluer ln x en x=1',
		'.résoudre ln x = 0',
		'.intégrer ln x',
		'.intégrer ln x de 1 à 2',
		'.simplifier ln x',
		'.factoriser ln x',
		'.dériver ln x',
		'.domaine ln x',
		'.limite ln x en 0',
		'.variations ln x',
		'.taylor ln x ordre 3',
		'f(x) = ln x',
		'f(x) = 2 ln x + 1',
		'a = ln 2x'
	])('« %s » : le même refus', (text) => {
		const message = refusalOf(text);
		expect(message).toMatch(/^« ln (x|2x) » : écris ln\((x|2x)\) avec des parenthèses\.$/);
	});

	it('ne crée aucun objet pour une définition refusée', () => {
		const s = session();
		refusalOf('f(x) = ln x', s);
		expect(s.atelier.get('f')).toBeUndefined();
	});

	it('cite le nom tapé seul quand rien ne le suit, sans inventer d’argument', () => {
		expect(refusalOf('ln')).toBe('« ln » : écris ln(…) avec des parenthèses.');
	});

	// Revue : la citation garde l'argument tel que l'élève l'a écrit
	it.each([
		['sin π', '« sin π » : écris sin(π) avec des parenthèses.'],
		['sin \\pi', '« sin \\pi » : écris sin(\\pi) avec des parenthèses.'],
		['ln |x|', '« ln |x| » : écris ln(|x|) avec des parenthèses.'],
		['ln -x', '« ln -x » : écris ln(-x) avec des parenthèses.'],
		['ln + 1', '« ln » : écris ln(…) avec des parenthèses.']
	])('« %s » : argument cité fidèlement', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	// Presque toujours une erreur : on refuse même si les lettres existent
	it('refuse `ln x` même quand la lettre l est posée', () => {
		expect(refusalOf('ln x', session('l = 2'))).toBe(
			'« ln x » : écris ln(x) avec des parenthèses.'
		);
	});

	it('refuse `cos x` même quand c, o et s sont posées', () => {
		expect(refusalOf('cos x', session('c = 1', 'o = 2', 's = 3'))).toBe(
			'« cos x » : écris cos(x) avec des parenthèses.'
		);
	});

	it.each(['text', 'mathfield'] as const)(
		'la carte d’une fonction porte le même refus (%s)',
		(provenance) => {
			expect(parseDefinition('function', 'ln x + 1', provenance).error).toBe(
				'« ln x » : écris ln(x) avec des parenthèses.'
			);
			expect(parseDefinition('function', '\\ln x', 'mathfield').error).toBeUndefined();
		}
	);

	it('refuse aussi un `ln x` sans antislash venu d’un champ MathLive', () => {
		expect(refusalOf('ln x', session(), 'mathfield')).toBe(
			'« ln x » : écris ln(x) avec des parenthèses.'
		);
	});
});

describe('les écritures justes restent lues', () => {
	it.each([
		['ln(x)', 'text', '\\ln\\left( x \\right)'],
		['2 ln(x)', 'text', '2 \\ln\\left( x \\right)'],
		['\\ln x', 'mathfield', '\\ln\\left( x \\right)'],
		['\\sin x', 'mathfield', '\\sin\\left( x \\right)'],
		// Mis au propre par `tidy` (lot 5d) : une seule forme, l'exposant du facteur
		['sin^2(x)', 'text', '\\sin\\left( x \\right)^2'],
		['sqrt[3](8)', 'text', '2'],
		['log_2(8)', 'text', '3']
	] as const)('« %s » (%s)', (text, provenance, latex) => {
		const result = runInput(session(), text, provenance);
		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.latex).toBe(latex);
	});

	it('`\\ln x` du clavier MathLive s’évalue en x = 1', () => {
		const result = runInput(session(), '.évaluer \\ln x en x=1', 'mathfield');
		expect(result.kind === 'commande' && result.output).toBe('0');
	});

	it('`f(x) = \\ln x` du clavier MathLive définit ln de x', () => {
		const s = session();
		runInput(s, 'f(x) = \\ln x', 'mathfield');
		expect(s.atelier.get('f')?.status).toBe('ok');
		const value = runInput(s, 'f(1)');
		expect(value.kind === 'calcul' && value.output).toBe('0');
	});

	// Revue : MathLive écrit `ln\left(x\right)` quand l'élève tape ln puis une parenthèse
	it('`ln\\left(x\\right)` d’un champ MathLive se lit ln(x)', () => {
		const result = runInput(session(), 'ln\\left(x\\right)', 'mathfield');
		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.latex).toBe('\\ln\\left( x \\right)');
	});

	it('`sqrt\\left(4\\right)` d’un champ MathLive vaut 2', () => {
		const result = runInput(session(), 'sqrt\\left(4\\right)', 'mathfield');
		expect(result.kind === 'calcul' && result.output).toBe('2');
	});

	it('`f(x) = ln\\left(x\\right)` d’un champ MathLive définit ln de x', () => {
		const s = session();
		runInput(s, 'f(x) = ln\\left(x\\right)', 'mathfield');
		expect(s.atelier.get('f')?.status).toBe('ok');
		const value = runInput(s, 'f(1)');
		expect(value.kind === 'calcul' && value.output).toBe('0');
	});

	// Revue : une liste de mots n'est pas une expression (la carte l'accepte déjà)
	it('`L = sin; cos; ln` n’est pas refusée comme fonction sans parenthèses', () => {
		const result = runInput(session(), 'L = sin; cos; ln');
		expect(result.kind).toBe('definition');
		expect(parseDefinition('list', 'sin; cos; ln', 'text').error).toBeUndefined();
	});

	it('`l n` écrit avec une espace reste le produit de deux lettres', () => {
		const result = runInput(session('l = 2'), 'l n');
		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.latex).toBe('l n');
	});

	it('`b c` avec deux valeurs posées reste leur produit', () => {
		const result = runInput(session('b = 2', 'c = 3'), 'b c');
		expect(result.kind === 'calcul' && result.output).toBe('6');
	});

	it('`.dériver ln(x)` reste calculée', () => {
		const result = runInput(session(), '.dériver ln(x)');
		expect(result.kind).toBe('commande');
	});
});

/**
 * Décision de David (2026-10-14) : un nom de fonction usuelle COLLÉ à son
 * argument (`lnx`, `sinx`, `ln2x`) se lisait en produit de lettres — `sinx`
 * donnait s·i·n·x, i pris pour l'imaginaire. Le même refus que `ln x`, quand
 * le nom est suivi d'UNE lettre ou d'un nombre (`2`, `2x`), puis d'une fin,
 * d'un opérateur, d'une espace ou d'une parenthèse fermante. `cost` se lit
 * cos(t) : un élève qui tape `cost` veut presque toujours cos(t).
 */
describe('une fonction usuelle collée à son argument est refusée', () => {
	it.each([
		['lnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['sinx', '« sinx » : écris sin(x) avec des parenthèses.'],
		['cosx', '« cosx » : écris cos(x) avec des parenthèses.'],
		['tanx', '« tanx » : écris tan(x) avec des parenthèses.'],
		['expx', '« expx » : écris exp(x) avec des parenthèses.'],
		['sqrtx', '« sqrtx » : écris sqrt(x) avec des parenthèses.'],
		['logx', '« logx » : écris log(x) avec des parenthèses.'],
		['ln2', '« ln2 » : écris ln(2) avec des parenthèses.'],
		['ln2x', '« ln2x » : écris ln(2x) avec des parenthèses.'],
		['sin2x', '« sin2x » : écris sin(2x) avec des parenthèses.'],
		['ln2,5', '« ln2,5 » : écris ln(2,5) avec des parenthèses.'],
		['cost', '« cost » : écris cos(t) avec des parenthèses.'],
		['sinθ', '« sinθ » : écris sin(θ) avec des parenthèses.'],
		// Le fragment fautif seulement
		['lnx + 1', '« lnx » : écris ln(x) avec des parenthèses.'],
		['lnx+1', '« lnx » : écris ln(x) avec des parenthèses.'],
		['2lnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['x + sinx', '« sinx » : écris sin(x) avec des parenthèses.'],
		['sinx^2', '« sinx » : écris sin(x) avec des parenthèses.'],
		['(lnx)', '« lnx » : écris ln(x) avec des parenthèses.'],
		['e^lnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['e^{lnx}', '« lnx » : écris ln(x) avec des parenthèses.'],
		['\\frac{lnx}{x}', '« lnx » : écris ln(x) avec des parenthèses.']
	])('ligne de calcul « %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it.each([
		['f(x) = sinx', '« sinx » : écris sin(x) avec des parenthèses.'],
		['a = ln2x', '« ln2x » : écris ln(2x) avec des parenthèses.'],
		['.dériver lnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['.limite lnx en 0', '« lnx » : écris ln(x) avec des parenthèses.'],
		['.évaluer cosx en x=0', '« cosx » : écris cos(x) avec des parenthèses.']
	])('« %s » : le même refus', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it('refuse `lnx` venu d’un champ MathLive, et la carte d’une fonction aussi', () => {
		expect(refusalOf('lnx', session(), 'mathfield')).toBe(
			'« lnx » : écris ln(x) avec des parenthèses.'
		);
		expect(parseDefinition('function', 'sinx + 1', 'text').error).toBe(
			'« sinx » : écris sin(x) avec des parenthèses.'
		);
	});

	// Comme `cos x` : presque toujours une erreur, même si les lettres existent
	it('refuse `cost` même quand c, o, s et t sont posées', () => {
		expect(refusalOf('cost', session('c = 1', 'o = 2', 's = 3', 't = 4'))).toBe(
			'« cost » : écris cos(t) avec des parenthèses.'
		);
	});
});

// Revue du 2026-10-14 : un produit écrit collé (`xlnx`) cache la même faute
describe('une fonction collée précédée d’une lettre, d’un nombre ou d’une puissance', () => {
	it.each([
		['xlnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['xsinx', '« sinx » : écris sin(x) avec des parenthèses.'],
		['2xlnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['x^2lnx', '« lnx » : écris ln(x) avec des parenthèses.'],
		['1 + xlnx', '« lnx » : écris ln(x) avec des parenthèses.']
	])('« %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	// Un mot plus long devant le nom n'est pas visé
	it.each(['explnx', 'costume', 'sinus'])('« %s » n’est pas refusé', (text) => {
		expect(runInput(session(), text).kind).not.toBe('refus');
	});
});

// `log` suivi de chiffres : base ou argument ? On ne propose pas log(10)
describe('`log` collé à des chiffres', () => {
	it.each([
		['log10', '« log10 » : écris log(…) avec des parenthèses ; log est le logarithme décimal.'],
		[
			'log2',
			'« log2 » : écris log(…) avec des parenthèses ; log est le logarithme décimal. En base 2 : log_2(…).'
		],
		[
			'log2 + 1',
			'« log2 » : écris log(…) avec des parenthèses ; log est le logarithme décimal. En base 2 : log_2(…).'
		]
	])('« %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it('`log_2(8)`, l’écriture de la base proposée, vaut 3', () => {
		const result = runInput(session(), 'log_2(8)');
		expect(result.kind === 'calcul' && result.output).toBe('3');
	});
});

// Revue du 2026-10-14 : ne jamais proposer une écriture d'un autre sens
describe('un nombre collé suivi d’une commande ou d’une parenthèse', () => {
	it.each([
		// `cos(2)` aurait un autre sens : forme neutre
		['cos2\\pi', '« cos2 » : écris cos(…) avec des parenthèses.'],
		['sin2\\theta', '« sin2 » : écris sin(…) avec des parenthèses.'],
		['sin2\\left(x\\right)', '« sin2 » : écris sin(…) avec des parenthèses.'],
		['ln2\\sqrt{x}', '« ln2 » : écris ln(…) avec des parenthèses.'],
		['ln2(x)', '« ln2 » : écris ln(…) avec des parenthèses.'],
		['sin2(x)', '« sin2 » : écris sin(…) avec des parenthèses.'],
		// Grec tapé directement : l'argument est entier
		['sin2π', '« sin2π » : écris sin(2π) avec des parenthèses.'],
		['cos2θ', '« cos2θ » : écris cos(2θ) avec des parenthèses.'],
		// Une fin de groupe ou un produit LaTeX reste une fin d'argument
		['\\left(ln2\\right)', '« ln2 » : écris ln(2) avec des parenthèses.'],
		['ln2\\cdot x', '« ln2 » : écris ln(2) avec des parenthèses.'],
		// Exposant Unicode
		['sinx²', '« sinx » : écris sin(x) avec des parenthèses.'],
		['lnx³ + 1', '« lnx » : écris ln(x) avec des parenthèses.']
	])('« %s »', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	it.each([
		[
			'log10(100)',
			'« log10 » : écris log(…) avec des parenthèses ; log est le logarithme décimal.'
		],
		[
			'log2(8)',
			'« log2 » : écris log(…) avec des parenthèses ; log est le logarithme décimal. En base 2 : log_2(…).'
		]
	])('« %s » : le message des bases', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});

	// Une lettre seule devant le nom est lue comme un coefficient : a·sin(x)
	it.each([
		['asinx', '« sinx » : écris sin(x) avec des parenthèses.'],
		['acosx', '« cosx » : écris cos(x) avec des parenthèses.'],
		['atanx', '« tanx » : écris tan(x) avec des parenthèses.']
	])('« %s » : lettre devant lue comme un coefficient', (text, message) => {
		expect(refusalOf(text)).toBe(message);
	});
});

describe('ce qui n’est pas une fonction collée reste lu', () => {
	function calcul(text: string, s: CalcSession = session()) {
		const result = runInput(s, text);
		expect(result.kind).toBe('calcul');
		return result.kind === 'calcul' ? result : null;
	}

	it.each([
		['e^x', '\\exponentialE^x'],
		['x sin(x)', 'x \\sin\\left( x \\right)'],
		['sin(x)', '\\sin\\left( x \\right)'],
		['ln(x)', '\\ln\\left( x \\right)'],
		['sin(2x)', '\\sin\\left( 2 x \\right)'],
		// Fonctions hyperboliques : `sinh` n'est pas sin(h)
		['sinh(x)', '\\sinh\\left( x \\right)'],
		['cosh(x)', '\\cosh\\left( x \\right)']
	])('« %s »', (text, latex) => {
		expect(calcul(text)?.latex).toBe(latex);
	});

	// Une suite plus longue n'est pas visée (lue en produit, comme avant)
	it.each(['sinus', 'lnxy', 'costume', 'sinh', 'tanh'])('« %s » n’est pas refusé', (text) => {
		expect(runInput(session(), text).kind).not.toBe('refus');
	});

	it('des lettres posées gardent leur produit (`st`, `s t`, `a s`)', () => {
		const s = session('s = 3', 't = 4', 'a = 2');
		expect(calcul('st', s)?.output).toBe('12');
		expect(calcul('s t', s)?.output).toBe('12');
		expect(calcul('a s', s)?.output).toBe('6');
	});

	it('une fonction de l’élève nommée `s` reste appelée', () => {
		const s = session('s(x) = x^2', 't = 4');
		expect(calcul('s(3)', s)?.output).toBe('9');
		expect(calcul('s(t)', s)?.output).toBe('16');
	});
});
