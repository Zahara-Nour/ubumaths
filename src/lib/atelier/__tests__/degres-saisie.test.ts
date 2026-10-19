/**
 * Écrire un angle comme sur la copie : `60°`, `60^\circ` (atelier, 2026-10-19).
 *
 * Mesuré avant (console de l'atelier) : `cos(60[°])` → 1/2, mais `cos(60°)`
 * restait non calculé (`°` lu comme une lettre), `\cos(60^{\circ})` répondait
 * « Unsupported symbol for custom syntax: circ », en anglais, et
 * `cos(60^\circ)` « Il manque l'exposant après ^ ». MathLive écrit `60\degree`
 * quand on tape `°` (mesuré dans Chromium, `mathlive-degres.svelte.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { evaluate } from '$lib/mathAST/eval';
import { substitute } from '$lib/mathAST/eval/substitute';
import { number } from '$lib/mathAST/factory';
import { Atelier } from '../atelier.svelte';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { graphLatexOf } from '../engine';
import { readableText } from '../copy-text';
import { calcTextOf } from '../natural-input';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** Taper ces lignes dans Calcul, rendre la réponse de la dernière. */
function typed(...lines: string[]): { result: CalcResult; s: CalcSession } {
	const s = session();
	let result: CalcResult = { kind: 'vide' };
	for (const line of lines) result = runInput(s, line);
	return { result, s };
}

function answer(...lines: string[]): string {
	const { result } = typed(...lines);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

function latex(...lines: string[]): string {
	const { result } = typed(...lines);
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.latex ?? '';
}

function refusal(...lines: string[]): string {
	const { result } = typed(...lines);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

const STRAY_DEGREE = 'Le signe ° s’écrit juste après un nombre ou un nom : 60°, cos(60°), a°.';

// =============================================================================
// 1. `60°` = `60[°]`, en texte
// =============================================================================

describe('un ° collé après un nombre, un nom ou une parenthèse est l’unité degré', () => {
	it.each([
		['cos(60°)', '1/2'],
		['sin(30°) + 1', '3/2'],
		['cos((30+30)°)', '1/2'],
		['tan(45°)', '1'],
		['cos(60 °)', '1/2'],
		['cos(-60°)', '1/2']
	])('%s → %s', (line, expected) => {
		expect(answer(line)).toBe(expected);
	});

	it('une valeur en degrés : a = 60° vaut 60°, et cos(a) = 1/2', () => {
		expect(answer('a = 60°', 'a')).toBe('60°');
		expect(answer('a = 60°', 'cos(a)')).toBe('1/2');
	});

	it('le nom d’une valeur : a = 60, cos(a°) = 1/2', () => {
		expect(answer('a = 60', 'cos(a°)')).toBe('1/2');
	});

	it('60° + 1 est refusé comme 60[°] + 1 (règle des grandeurs)', () => {
		expect(refusal('60° + 1')).toBe(refusal('60[°] + 1'));
	});

	it('cos(60°) écrit 1/2 en LaTeX', () => {
		expect(latex('cos(60°)')).toBe('\\dfrac{1}{2}');
	});
});

describe('un ° ailleurs : un refus en français', () => {
	it.each(['°', 'cos(°60)', '2 + °', '^\\circ'])('%s', (line) => {
		expect(refusal(line)).toBe(STRAY_DEGREE);
	});

	it('dans une définition aussi : a = °', () => {
		const { s } = typed('a = ° + 1');
		const a = s.atelier.get('a');
		expect(a === undefined || a.status === 'error').toBe(true);
	});
});

describe('rien ne change ailleurs', () => {
	it('cos(60) reste en radians', () => {
		const { result } = typed('cos(60)');
		expect(result.kind === 'calcul' && result.output).toBe('cos(60)');
		expect(result.kind === 'calcul' && result.alternative?.latex).toBe('\\approx -0{,}9524');
	});

	it('20 °C reste une température, avec son espace', () => {
		expect(answer('20 °C')).toBe('20 °C');
		expect(latex('20 °C')).toBe('20~{}^{\\circ}\\mathrm{C}');
	});
});

// =============================================================================
// 2. LaTeX : `^\circ`, `^{\circ}`, `\degree` (MathLive)
// =============================================================================

describe('le degré en LaTeX', () => {
	it.each([
		['\\cos(60^{\\circ})', '1/2'],
		['cos(60^\\circ)', '1/2'],
		['\\cos\\left(60\\degree\\right)', '1/2'],
		['\\cos\\left(60^{\\circ}\\right)', '1/2'],
		['\\sin\\left(\\frac{\\pi}{6}\\right)+\\cos\\left(60\\degree\\right)', '1']
	])('%s → %s', (line, expected) => {
		expect(answer(line)).toBe(expected);
	});

	it.each(['60^\\circ', '60^{\\circ}', '60\\degree', '60{}^{\\circ}'])('%s → 60°', (line) => {
		expect(answer(line)).toBe('60°');
	});

	it('plus jamais le message anglais du parseur', () => {
		for (const line of ['\\cos(60^{\\circ})', '60^\\circ', 'cos(60^\\circ)']) {
			const { result } = typed(line);
			expect(JSON.stringify(result)).not.toMatch(/Unsupported|circ\.|exposant/);
		}
	});

	it('une carte écrite dans MathLive : a = 60\\degree, f(x) = \\cos(x\\degree)', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: '60\\degree' }, 'mathfield');
		s.atelier.create(
			{ kind: 'function', name: 'f', definition: '\\cos\\left(x^{\\circ}\\right)' },
			'mathfield'
		);
		expect(s.atelier.get('a')?.status).toBe('ok');
		expect(s.atelier.get('f')?.status).toBe('ok');
		const cosA = runInput(s, 'cos(a)');
		expect(cosA.kind === 'calcul' && cosA.output).toBe('1/2');
		const f60 = runInput(s, 'f(60)');
		expect(f60.kind === 'calcul' && f60.output).toBe('1/2');
	});

	it('le champ mathématique de la console envoie cos(60°) en texte', () => {
		const converted = calcTextOf('\\cos\\left(60\\degree\\right)', []);
		expect(converted.ok && converted.text).toBe('\\cos(60°)');
	});
});

// =============================================================================
// 3. cos(90°) dans une fonction ou une suite
// =============================================================================

describe('un angle en degrés pris par cos, sin, tan dans une fonction ou une suite', () => {
	it('h(x) = cos(90°)·x : h(1) = 0, .variations h constante', () => {
		expect(answer('h(x) = cos(90°)*x', 'h(1)')).toBe('0');
		const variations = answer('h(x) = cos(90°)*x', '.variations h');
		expect(variations).toContain('constante');
	});

	it('f(x) = sin(30°) + x : f(0) = 1/2', () => {
		expect(answer('f(x) = sin(30°) + x', 'f(0)')).toBe('1/2');
	});

	it('u(n) = cos(60°)·n : u(2) = 1', () => {
		expect(answer('u(n) = cos(60°)*n', 'u(2)')).toBe('1');
	});

	it('.résoudre h(x)=1 avec h(x) = cos(60°)·x : x = 2, sans cosinus d’une grandeur', () => {
		const { result } = typed('h(x) = cos(60°)*x', '.résoudre h(x)=1');
		expect(result.kind === 'commande' && result.latex).toBe('x = 2');
	});

	it('.évaluer cos(60°)*x en x=2 : 1', () => {
		const { result } = typed('.évaluer cos(60°)*x en x=2');
		expect(JSON.stringify(result)).not.toContain('rad');
		expect(result.kind === 'commande' && result.output).toMatch(/(^|= )1$/);
	});
});

// =============================================================================
// 4. Une variable en degrés : cos(x°) accepté (exact), x° seul refusé
// =============================================================================

describe('une variable en degrés', () => {
	it('f(x) = cos(x°) : f(90) = 0, f(60) = 1/2', () => {
		expect(answer('f(x) = cos(x°)', 'f(90)')).toBe('0');
		expect(answer('f(x) = cos(x°)', 'f(60)')).toBe('1/2');
	});

	it('f(x) = cos(x°) : le tracé du Graphe est cos(πx/180), sans unité', () => {
		const { s } = typed('f(x) = cos(x°)');
		const drawn = graphLatexOf(s.atelier, 'f') ?? '';
		expect(drawn).not.toContain('unit');
		expect(drawn).not.toContain('circ');
		const ast = parseLatexSafe(drawn).ast;
		if (ast === undefined || ast === null) throw new Error(`illisible : ${drawn}`);
		const at = (x: number) => {
			const value = evaluate(substitute(ast, { x: number(String(x)) }), { mode: 'decimal' });
			return value.status === 'value' ? Number(value.value) : NaN;
		};
		expect(at(90)).toBeCloseTo(0, 10);
		expect(at(60)).toBeCloseTo(0.5, 10);
		expect(at(180)).toBeCloseTo(-1, 10);
	});

	it.each(['f(x) = 2x°', 'f(x) = x[°]', 'u(n) = n°'])(
		'%s : en erreur, un angle brut dans une fonction',
		(line) => {
			const { s } = typed(line);
			const object = s.atelier.objects[0];
			expect(object?.status).toBe('error');
			expect(object?.message).toContain('Une mesure d’angle est une grandeur');
		}
	);
});

// =============================================================================
// 5. Affichage : 60°, sans espace ni crochets
// =============================================================================

describe('la réponse écrit 60°', () => {
	it.each([
		['60°', '60°', '60{}^{\\circ}'],
		['60[°]', '60°', '60{}^{\\circ}'],
		['2*45°', '90°', '90{}^{\\circ}']
	])('%s → %s', (line, text, expectedLatex) => {
		expect(answer(line)).toBe(text);
		expect(latex(line)).toBe(expectedLatex);
	});

	it('copiée en texte : 60°', () => {
		expect(readableText(latex('60°'))).toBe('60°');
	});

	it('la valeur approchée aussi : 100° / 3 ≈ 33,3333°', () => {
		const { result } = typed('100° / 3');
		expect(result.kind === 'calcul' && result.alternative?.latex).toBe(
			'\\approx 33{,}3333{}^{\\circ}'
		);
	});
});

// =============================================================================
// La grille : les grandeurs y passent déjà
// =============================================================================

describe('une cellule de la grille', () => {
	it('=cos(60°) vaut ce que vaut =cos(60[°])', () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '=cos(60°)' },
			{ column: 1, row: 1, text: '=cos(60[°])' }
		]);
		const [typedDegree, bracketed] = [atelier.cellValue(0, 1), atelier.cellValue(1, 1)];
		expect(bracketed.kind).toBe('number');
		expect(typedDegree.kind).toBe('number');
		expect(typedDegree.kind === 'number' && typedDegree.value).toBeCloseTo(0.5, 10);
	});
});
