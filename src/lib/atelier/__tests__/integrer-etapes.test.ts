/**
 * Atelier — « Comment ? » pour `.intégrer` (plan `docs/wip/atelier-progress.md`,
 * 2b, PR 1 ; décisions de David du 2026-10-13).
 *
 * La réponse de la ligne reste celle du moteur `integration`. Les étapes de
 * `pedagogical-integration` ne s'ajoutent que quand elles disent vrai :
 *
 * - **montrées** : polynômes, eˣ, 1/x sur un intervalle de signe constant,
 *   cos/sin, IPP (cyclique comprise), éléments simples à facteurs x − r, et
 *   toutes les composées : exactement u′·f(u) (`2e^{2x}`), ou avec un
 *   coefficient que l'étape « On fait apparaître u′ » explique (`e^{2x}`,
 *   `\sin(2x)`, `e^{-x}`, `\frac3x`… — refusées en PR 1, montrées depuis la
 *   PR 2, décisions de David du 2026-10-13) ;
 * - **refusées** (pas d'étapes, la ligne garde sa réponse) : un coefficient
 *   réellement caché (éléments simples à facteur non unitaire, étape composée
 *   sans réécriture), des bornes littérales, des étapes qui ne concordent pas
 *   avec le moteur (`\ln x` de 0 à 1), un intégrande que les étapes ne savent
 *   pas rédiger (`\frac{1}{x^2}`).
 * - **pôle dans [a ; b]** : la ligne est un REFUS, au message du moteur
 *   inchangé ; elle porte les étapes du refus rédigé (« non définie en x = 0,
 *   qui appartient à [−1 ; 1] ») quand elles concluent « non définie » ET que
 *   la valeur citée est vraiment interdite et dans [a ; b] (décision de David,
 *   2026-10-13). Les refus des autres commandes restent sans étapes.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { integrateSteps } from '../integrate-steps';
import { citesForbiddenPoint, hasUnexplainedCoefficient } from '../integrate-steps-check';
import { parseLatex } from '$lib/mathAST/parser';
import { superscript, euler, implicitMultiply, number, fraction } from '$lib/mathAST/factory';
import {
	generatePedagogicalIntegrationSteps,
	type PedagogicalIntegrationStep
} from '$lib/mathAST/pedagogical-integration';
import { astOf } from '../parse';

// =============================================================================
// Décor
// =============================================================================

function lastEntry(input: string) {
	const desk = new CalcDesk(new Atelier());
	desk.submit(input);
	return desk.entries[desk.entries.length - 1];
}

/** Toutes les étapes, sous-étapes comprises. */
function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

/** La réponse du moteur, en arbre, pour appeler `integrateSteps` directement. */
function node(text: string) {
	const parsed = astOf(text, 'text');
	if (parsed === null) throw new Error(`illisible : ${text}`);
	return parsed;
}

// =============================================================================
// Montrées : la ligne porte des étapes et leur résumé
// =============================================================================

describe('.intégrer : étapes montrées quand elles disent vrai', () => {
	it.each([
		// [saisie, réponse de la ligne — celle du moteur, inchangée]
		['.intégrer x^2', '\\dfrac{1}{3} x^3 + C'],
		['.intégrer 3x^2+2x', 'x^3 + x^2 + C'],
		['.intégrer 3e^x', '3 \\exponentialE^x + C'],
		['.intégrer 5\\cos(x)', '5 \\sin\\left( x \\right) + C'],
		['.intégrer 2e^{2x}', '\\exponentialE^{2 x} + C'],
		['.intégrer 2xe^{x^2}', '\\exponentialE^{x^2} + C'],
		['.intégrer \\frac{2x}{x^2+1}', '\\ln\\left( x^2 + 1 \\right) + C'],
		['.intégrer xe^x', '\\left( x - 1 \\right) \\exponentialE^x + C'],
		['.intégrer \\ln(x)', 'x \\ln\\left( x \\right) - x + C'],
		// Hors terminale, montrés (décision de David) : IPP cyclique, éléments simples
		[
			'.intégrer e^x\\sin(x)',
			'\\dfrac{1}{2} \\exponentialE^x \\sin\\left( x \\right) - \\dfrac{1}{2} \\cos\\left( x \\right) \\exponentialE^x + C'
		],
		// ln|u| écrit comme dans les étapes : `\\ln\\left| u \\right|` (revue du 2026-10-13)
		[
			'.intégrer \\frac{1}{x^2-1}',
			'\\dfrac{1}{2} \\ln\\left| x - 1 \\right| - \\dfrac{1}{2} \\ln\\left| x + 1 \\right| + C'
		]
	])('%s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeDefined();
		expect(entry.steps!.length).toBeGreaterThan(0);
		// Le résumé : mêmes titres, sans les « pourquoi »
		expect(entry.summary).toBeDefined();
		expect(flatten(entry.summary!).map((s) => s.title)).toEqual(
			flatten(entry.steps!).map((s) => s.title)
		);
		expect(flatten(entry.summary!).every((s) => s.explanation === undefined)).toBe(true);
	});

	it('texte : `.intégrer x^3+1` (sans LaTeX)', () => {
		const entry = lastEntry('.intégrer x^3+1');
		expect(entry.steps).toBeDefined();
	});

	it('`+ C` gardé : la dernière étape ajoute la constante', () => {
		const entry = lastEntry('.intégrer x^2');
		expect(entry.steps![entry.steps!.length - 1].rule).toBe('add-constant');
	});

	it.each([
		['.intégrer x^2 de 0 à 1', '\\dfrac{1}{3}'],
		['.intégrer \\frac1x de 1 à 2', '\\ln\\left( 2 \\right)'],
		['.intégrer 1/x de 1 à 2', '\\ln\\left( 2 \\right)'],
		// Éléments simples, facteurs x − r : rien de caché
		['.intégrer \\frac{1}{x(x-1)} de 2 à 3', '2 \\ln\\left( 2 \\right) - \\ln\\left( 3 \\right)']
	])('intégrale définie %s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeDefined();
		expect(entry.steps!.map((s) => s.rule)).toContain('simplify-bounds-result');
	});

	it('une autre variable : `.intégrer 3t^2 pour t`', () => {
		const entry = lastEntry('.intégrer 3t^2 pour t');
		expect(entry.latex).toBe('t^3 + C');
		expect(entry.steps).toBeDefined();
	});

	it('les virgules décimales s’écrivent aussi dans les étapes', () => {
		const entry = lastEntry('.intégrer x de 0 à 0.5');
		const latex = flatten(entry.steps!)
			.map((s) => s.expressionLatex ?? '')
			.join(' ');
		expect(latex).toContain('{,}');
		expect(latex).not.toMatch(/\d\.\d/);
	});
});

// =============================================================================
// Composées à coefficient : montrées depuis la PR 2 (refusées en PR 1)
// =============================================================================

describe('.intégrer : composée à coefficient, expliqué par « On fait apparaître u′ »', () => {
	it.each([
		['.intégrer e^{2x}', '\\dfrac{1}{2} \\exponentialE^{2 x} + C'],
		['.intégrer \\sin(2x)', '-\\dfrac{1}{2} \\cos\\left( 2 x \\right) + C'],
		['.intégrer xe^{x^2}', '\\dfrac{1}{2} \\exponentialE^{x^2} + C'],
		['.intégrer \\cos(3x+1)', '\\dfrac{1}{3} \\sin\\left( 3 x + 1 \\right) + C'],
		['.intégrer \\frac{1}{2x+1}', '\\dfrac{1}{2} \\ln\\left| 2 x + 1 \\right| + C'],
		['.intégrer e^{-x}', '-\\exponentialE^{-x} + C'],
		['.intégrer -e^{-x}', '\\exponentialE^{-x} + C'],
		['.intégrer \\frac3x', '3 \\ln\\left| x \\right| + C'],
		['.intégrer \\frac{x}{x^2+1}', '\\dfrac{1}{2} \\ln\\left( x^2 + 1 \\right) + C'],
		['.intégrer (2x+1)^3', '\\dfrac{1}{8} \\left( 2 x + 1 \\right)^4 + C'],
		// IPP : v = ½e^{2x} et ∫ ½e^{2x} dx, chacun avec sa réécriture
		[
			'.intégrer xe^{2x}',
			'\\dfrac{1}{2} x \\exponentialE^{2 x} - \\dfrac{1}{4} \\exponentialE^{2 x} + C'
		],
		['.intégrer e^{2x} de 0 à 1', '\\dfrac{1}{2} \\exponentialE^2 - \\dfrac{1}{2}']
	])('%s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeDefined();
		const rules = flatten(entry.steps!).map((s) => s.rule);
		expect(rules).toContain('reveal-derivative');
		expect(entry.summary).toBeDefined();
	});

	// u′ = 1 : l'étape s'appelle « On sort la constante k » (décision de David
	// du 2026-10-13) ; la garde la reconnaît toujours, le « Comment ? » reste
	it.each([
		['.intégrer \\frac3x', 'On sort la constante $3$'],
		['.intégrer 3(x+1)^2', 'On sort la constante $3$'],
		['.intégrer \\frac{-2}{x}', 'On sort la constante $-2$'],
		['.intégrer \\frac{-1}{x}', 'On sort le signe $-$']
	])('%s : « %s », étapes gardées', (input, title) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.steps).toBeDefined();
		expect(entry.summary).toBeDefined();
		const reveal = flatten(entry.steps!).find((s) => s.rule === 'reveal-derivative');
		expect(reveal?.title).toBe(title);
	});

	// Le signe − devant l'intégrande : même titre que `\frac{-1}{x}` (décision
	// de David du 2026-10-13), « Comment ? » gardé, valeur concordante
	it.each([
		['.intégrer -e^x'],
		['.intégrer -\\frac{1}{x+1}'],
		['.intégrer -(x+1)^3'],
		['.intégrer -\\cos x'],
		['.intégrer -e^x de 0 à 1']
	])('%s : « On sort le signe $-$ », étapes gardées', (input) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.steps).toBeDefined();
		expect(entry.summary).toBeDefined();
		const titles = flatten(entry.steps!).map((s) => s.title);
		expect(titles).toContain('On sort le signe $-$');
		expect(titles).not.toContain('On sort la constante $-1$');
	});

	it('en texte aussi : `.intégrer exp(2x)`', () => {
		expect(lastEntry('.intégrer exp(2x)').steps).toBeDefined();
	});
});

// =============================================================================
// Refusées : la ligne garde la réponse du moteur, sans étapes
// =============================================================================

describe('.intégrer : coefficient réellement caché (éléments simples) → pas d’étapes', () => {
	it.each([
		// Éléments simples à facteur non unitaire : le titre promet A·ln|x − r|,
		// la ligne écrit (A/2)·ln|2x − 1| (revue du 2026-10-13)
		[
			'.intégrer \\frac{1}{(2x-1)(x+1)}',
			'\\dfrac{1}{3} \\ln\\left| 2 x - 1 \\right| - \\dfrac{1}{3} \\ln\\left| x + 1 \\right| + C'
		],
		[
			'.intégrer \\frac{3}{2x^2+x-1}',
			'\\ln\\left| 2 x - 1 \\right| - \\ln\\left| x + 1 \\right| + C'
		],
		[
			'.intégrer \\frac{1}{4x^2-1}',
			'\\dfrac{1}{4} \\ln\\left| 2 x - 1 \\right| - \\dfrac{1}{4} \\ln\\left| 2 x + 1 \\right| + C'
		]
	])('%s', (input, answer) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe(answer);
		expect(entry.steps).toBeUndefined();
		expect(entry.summary).toBeUndefined();
	});
});

describe('.intégrer : autres refus', () => {
	it('bornes littérales : `.intégrer x^2 de 0 à a` → pas d’étapes, réponse du moteur', () => {
		const entry = lastEntry('.intégrer x^2 de 0 à a');
		expect(entry.latex).toBe('\\dfrac{1}{3} a^3');
		expect(entry.steps).toBeUndefined();
	});

	it('étapes discordantes : `\\ln x` de 0 à 1 → le moteur dit −1, les étapes refusent', () => {
		const entry = lastEntry('.intégrer \\ln(x) de 0 à 1');
		expect(entry.latex).toBe('-1');
		expect(entry.steps).toBeUndefined();
	});

	it('pas de rédaction : `\\frac{1}{x^2}` → la réponse du moteur seule', () => {
		const entry = lastEntry('.intégrer \\frac{1}{x^2}');
		expect(entry.latex).toBe('-\\dfrac{1}{x} + C');
		expect(entry.steps).toBeUndefined();
	});
});

// =============================================================================
// Pôle dans [a ; b] : le refus du moteur, avec les étapes du refus rédigé
// =============================================================================

describe('.intégrer : pôle dans [a ; b] → refus du moteur + étapes du refus', () => {
	it.each([
		// [saisie, message du moteur (inchangé), valeur interdite, intervalle des étapes]
		[
			'.intégrer \\frac1x de -1 à 1',
			"L'intégrale diverge ou n'est pas définie sur [-1 ; 1]",
			'x = 0',
			'\\left[ -1 ; 1 \\right]'
		],
		[
			'.intégrer 1/x de -1 à 1',
			"L'intégrale diverge ou n'est pas définie sur [-1 ; 1]",
			'x = 0',
			'\\left[ -1 ; 1 \\right]'
		],
		[
			'.intégrer \\frac{1}{x-2} de 1 à 3',
			"L'intégrale diverge ou n'est pas définie sur [1 ; 3]",
			'x = 2',
			'\\left[ 1 ; 3 \\right]'
		],
		// Borne = pôle : les étapes disent « 0 appartient à [0 ; 1] » (bornes
		// comprises), le moteur « la primitive diverge en x = 0 » : concordants
		[
			'.intégrer \\frac1x de 0 à 1',
			"L'intégrale diverge ou n'est pas définie sur [0 ; 1]",
			'x = 0',
			'\\left[ 0 ; 1 \\right]'
		],
		// Bornes à l'envers : l'intervalle des étapes est remis dans l'ordre
		[
			'.intégrer \\frac1x de 1 à -1',
			"L'intégrale diverge ou n'est pas définie sur [1 ; -1]",
			'x = 0',
			'\\left[ -1 ; 1 \\right]'
		]
	])('%s', (input, message, point, interval) => {
		const entry = lastEntry(input);
		// Le refus garde son message, mot pour mot
		expect(entry.failed).toBe(true);
		expect(entry.text).toContain(message);
		expect(entry.latex).toBeUndefined();
		// … et porte les étapes, qui concluent « non définie »
		expect(entry.steps).toBeDefined();
		const last = entry.steps![entry.steps!.length - 1];
		expect(last.rule).toBe('integrand-undefined-on-interval');
		expect(last.expressionLatex).toContain(point);
		expect(last.expressionLatex).toContain(interval);
		// Aucune valeur calculée par les étapes
		expect(entry.steps!.map((s) => s.rule)).not.toContain('simplify-bounds-result');
		// Le résumé : mêmes titres, sans les « pourquoi »
		expect(entry.summary).toBeDefined();
		expect(entry.summary!.map((s) => s.title)).toEqual(entry.steps!.map((s) => s.title));
		expect(entry.summary!.every((s) => s.explanation === undefined)).toBe(true);
	});

	it('décimaux à la française dans les étapes du refus : `de -0.5 à 1`', () => {
		const entry = lastEntry('.intégrer \\frac1x de -0.5 à 1');
		expect(entry.failed).toBe(true);
		const latex = entry.steps!.map((s) => s.expressionLatex ?? '').join(' ');
		expect(latex).toContain('{,}');
		expect(latex).not.toMatch(/\d\.\d/);
	});

	it('refus que la garde bloque : `\\tan x` de 0 à 2 → refus du moteur, sans étapes', () => {
		// Les étapes citent π/2, mais tan(π/2) se calcule en un nombre fini
		// (≈ 1,6·10¹⁶) : la valeur n'est pas prouvée interdite, pas d'étapes
		const entry = lastEntry('.intégrer \\tan x de 0 à 2');
		expect(entry.failed).toBe(true);
		expect(entry.text).toContain("L'intégrale diverge ou n'est pas définie sur [0 ; 2]");
		expect(entry.steps).toBeUndefined();
		expect(entry.summary).toBeUndefined();
	});

	it.each([
		['.dériver |x|', 'la valeur absolue n'],
		['.dériver x^2 ; ab', '« ab » n']
	])('non-régression : le refus de `%s` reste sans étapes', (input, message) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(true);
		expect(entry.text).toContain(message);
		expect(entry.steps).toBeUndefined();
		expect(entry.summary).toBeUndefined();
	});
});

describe('citesForbiddenPoint : la valeur citée par le refus, vérifiée', () => {
	const f = node('1/x');
	const [a, b] = [node('-1'), node('1')];

	it('0 pour 1/x sur [−1 ; 1] : interdite et dans l’intervalle', () => {
		expect(citesForbiddenPoint(f, 'x', node('0'), a, b)).toBe(true);
	});

	it('bornes à l’envers : même intervalle', () => {
		expect(citesForbiddenPoint(f, 'x', node('0'), b, a)).toBe(true);
	});

	it('une borne : appartient à [a ; b]', () => {
		expect(citesForbiddenPoint(f, 'x', node('0'), node('0'), b)).toBe(true);
	});

	it('hors de l’intervalle : refusée', () => {
		expect(citesForbiddenPoint(node('1/(x-5)'), 'x', node('5'), a, b)).toBe(false);
	});

	it('pas une valeur interdite (f y est définie) : refusée', () => {
		expect(citesForbiddenPoint(node('x^2'), 'x', node('0'), a, b)).toBe(false);
	});

	it('une autre lettre que la variable : refusée (f ne s’évalue nulle part)', () => {
		// Sans cette garde, 1/(x − k) vaut NaN partout, donc « interdite » en 0,5
		expect(citesForbiddenPoint(node('1/(x-k)'), 'x', node('0.5'), a, b)).toBe(false);
	});

	it('une valeur non numérique : refusée', () => {
		expect(citesForbiddenPoint(f, 'x', node('k'), a, b)).toBe(false);
	});
});

// =============================================================================
// La garde de concordance, appelée directement
// =============================================================================

describe('integrateSteps : la garde de concordance', () => {
	it('primitive : une primitive du moteur à une constante près est acceptée', () => {
		// x³/3 + 7 : même dérivée que x³/3
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds: null }, node('x^3/3+7'))
		).not.toBeNull();
	});

	it('primitive : une réponse du moteur différente est refusée', () => {
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds: null }, node('x^3'))
		).toBeNull();
	});

	it('définie : une valeur du moteur différente est refusée', () => {
		const bounds = { lower: '0', upper: '1' };
		expect(
			integrateSteps({ expression: 'x^2', variable: null, bounds }, node('1/3'))
		).not.toBeNull();
		expect(integrateSteps({ expression: 'x^2', variable: null, bounds }, node('1/2'))).toBeNull();
	});

	it('ne lève jamais : saisie illisible → null', () => {
		expect(
			integrateSteps({ expression: ')(', variable: null, bounds: null }, node('x'))
		).toBeNull();
	});
});

// =============================================================================
// La garde des coefficients, appelée directement
// =============================================================================

describe('hasUnexplainedCoefficient : expliqué par une réécriture, ou caché', () => {
	const stepsOf = (latex: string) =>
		generatePedagogicalIntegrationSteps(parseLatex(latex), { level: 'lycee' }).steps;
	const withoutReveal = (steps: readonly PedagogicalIntegrationStep[]) =>
		steps.filter((s) => s.rule !== 'reveal-derivative');

	it('`e^{2x}` tel que rédigé : la réécriture explique le ½', () => {
		expect(hasUnexplainedCoefficient(stepsOf('e^{2x}'))).toBe(false);
	});

	it('la même forme composée SANS l’étape de réécriture : refusée', () => {
		expect(hasUnexplainedCoefficient(withoutReveal(stepsOf('e^{2x}')))).toBe(true);
		expect(hasUnexplainedCoefficient(withoutReveal(stepsOf('\\frac{x}{x^2+1}')))).toBe(true);
		// u′ = 1 : « On sort la constante 3 » retirée, le 3 de 3 ln|x| est caché
		expect(hasUnexplainedCoefficient(stepsOf('\\frac3x'))).toBe(false);
		expect(hasUnexplainedCoefficient(withoutReveal(stepsOf('\\frac3x')))).toBe(true);
	});

	it('une réécriture fausse (e^{2x} = ⅓ × 2e^{2x}) : refusée', () => {
		const steps = stepsOf('e^{2x}');
		const forged = steps.map((step) =>
			step.rule === 'reveal-derivative'
				? { ...step, bindings: { ...step.bindings, k: fraction(number('1'), number('3')) } }
				: step
		);
		expect(hasUnexplainedCoefficient(forged)).toBe(true);
	});

	it('une forme composée qui écrit ½e^{2x} sans coefficient déclaré (avant la PR 2) : refusée', () => {
		const u = implicitMultiply(number('2'), parseLatex('x'));
		const hidden: PedagogicalIntegrationStep = {
			id: 1,
			rule: 'apply-composite-exp',
			description: '',
			before: superscript(euler(), u),
			after: implicitMultiply(fraction(number('1'), number('2')), superscript(euler(), u)),
			variable: 'x',
			verbosityLevel: 'summarized',
			bindings: { u }
		};
		expect(hasUnexplainedCoefficient([hidden])).toBe(true);
	});
});

// =============================================================================
// IPP : notation de terminale (PR 3, décision de David du 2026-10-13)
// =============================================================================

describe('.intégrer : IPP en notation de terminale (u, v′), étapes gardées', () => {
	it.each([
		['.intégrer xe^x de 0 à 1', '1'],
		['.intégrer \\ln(x) de 1 à e', '1'],
		['.intégrer x\\ln(x)', null],
		['.intégrer x^2e^x', null],
		['.intégrer xe^{2x}', null],
		['.intégrer e^x\\sin(x)', null]
	])('%s', (input, value) => {
		const entry = lastEntry(input);
		expect(entry.failed).toBe(false);
		if (value !== null) expect(entry.latex).toBe(value);
		// Le « Comment ? » reste : la garde reconnaît toujours les étapes
		expect(entry.steps).toBeDefined();
		expect(entry.summary).toBeDefined();
		const chooses = flatten(entry.steps!).filter((s) => s.rule === 'choose-u-dv');
		expect(chooses.length).toBeGreaterThan(0);
		for (const choose of chooses) {
			expect(choose.explanation).toMatch(/^On pose \$u\(x\) = .+\$ et \$v'\(x\) = /);
			expect(choose.explanation).not.toMatch(/\bdv\b|\bdu\b/);
		}
	});
});
