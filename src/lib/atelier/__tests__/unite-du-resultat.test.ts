/**
 * L'unité du résultat d'un calcul de grandeurs : UNE règle, trois chemins
 * ========================================================================
 *
 * Règle reprise à zéro par David le 2026-11-02, cas validés un à un sur la page
 * à cocher du 2026-11-03 (docs/wip/registre-reference-progress.md § Unité du
 * résultat) : le résultat s'écrit dans une des unités TAPÉES, celle où la valeur
 * a le moins de chiffres (à égalité la plus petite) ; une durée où au moins deux
 * de h, min, s sont tapées s'écrit en h-min-s.
 *
 * `tidy` (donc `simplify` et le registre), `{{eval}}` des questions et l'Atelier
 * rendent la même grandeur.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { tidy } from '$lib/mathAST/tidy';
import { simplify } from '$lib/mathAST/simplify';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { toCustom } from '$lib/mathAST/custom-generator';
import { evaluateAstWithModifiers } from '$lib/mathAST/eval/evaluate-with-modifiers';
import { resolveVariables } from '$lib/ubumark/parameterization';
import { expectedInRequiredUnit } from '$lib/questions/units/required-unit';
import { validateQuantityAnswer } from '$lib/questions/units/validator';
import { Atelier } from '../atelier.svelte';
import { simplifySteps } from '../simplify-steps';
import { runInput, type CalcResult } from '../calcul';

// Types

/** Un cas de la page à cocher : saisie, `tidy`, `{{eval}}`, Atelier (LaTeX) */
type Cas = readonly [id: string, input: string, tidied: string, evaluated: string, latex: string];

// Constantes

const CAS: readonly Cas[] = [
	['type-01', '12000[m]', '12000[m]', '12000[m]', '12000~\\mathrm{m}'],
	['type-02', '3600[s]', '3600[s]', '3600[s]', '3600~\\mathrm{s}'],
	['type-03', '0.5[km]', '0.5[km]', '0.5[km]', '0{,}5~\\mathrm{km}'],
	['type-04', '12[km]+500[m]', '12.5[km]', '12.5[km]', '12{,}5~\\mathrm{km}'],
	['type-05', '2000[m]+3[km]', '5[km]', '5[km]', '5~\\mathrm{km}'],
	['type-06', '3[km]+2000[m]', '5[km]', '5[km]', '5~\\mathrm{km}'],
	['type-07', '500[m]+1[km]', '1.5[km]', '1.5[km]', '1{,}5~\\mathrm{km}'],
	['type-08', '5[km]+3[m]', '5003[m]', '5003[m]', '5003~\\mathrm{m}'],
	['type-09', '1[km]-999[m]', '1[m]', '1[m]', '1~\\mathrm{m}'],
	['type-10', '1[m]+1[km]', '1001[m]', '1001[m]', '1001~\\mathrm{m}'],
	['type-11', '3[km]+1[mm]', '3000001[mm]', '3000001[mm]', '3000001~\\mathrm{mm}'],
	['type-12', '1[kg]-999.5[g]', '0.5[g]', '0.5[g]', '0{,}5~\\mathrm{g}'],
	['type-13', '1[Ko]+1[o]', '1001[o]', '1001[o]', '1001~\\mathrm{o}'],
	['type-14', '7[mm]*5[cm]', '3.5[cm^2]', '3.5[cm^2]', '3{,}5~\\mathrm{cm}^{2}'],
	['type-15', '2[cm]*3[mm]', '60[mm^2]', '60[mm^2]', '60~\\mathrm{mm}^{2}'],
	['type-17', '3[kW]*2[h]', '6[kW.h]', '6[kW.h]', '6~\\mathrm{kW}\\cdot\\mathrm{h}'],
	['type-18', '3[N]*2[m]', '6[N.m]', '6[N.m]', '6~\\mathrm{N}\\cdot\\mathrm{m}'],
	['type-19', '2[kg]*3[m/s^2]', '6[kg.m/s^2]', '6[kg.m/s^2]', '6~\\mathrm{kg}'],
	['type-20', '120[km]/2[h]', '60[km/h]', '60[km/h]', '60~\\mathrm{km}/\\mathrm{h}'],
	['type-21', '90[km/h]*2[h]', '180[km]', '180[km]', '180~\\mathrm{km}'],
	['duree-01', '2[h]+30[min]', '2[h] 30[min]', '{2[h]}{30[min]}', '2~\\mathrm{h}~30~\\mathrm{min}'],
	[
		'duree-02',
		'1[h]+45[min]+30[min]',
		'2[h] 15[min]',
		'{2[h]}{15[min]}',
		'2~\\mathrm{h}~15~\\mathrm{min}'
	],
	['duree-03', '1[h]-59[min]', '1[min]', '1[min]', '1~\\mathrm{min}'],
	['duree-04', '150[min]', '150[min]', '150[min]', '150~\\mathrm{min}'],
	['duree-05', '1[h]+0.5[h]', '1.5[h]', '1.5[h]', '1{,}5~\\mathrm{h}']
];

// Fonctions

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const latexOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.latex : undefined;

// Tests

describe('l’unité du résultat : la même règle dans tidy, {{eval}} et l’Atelier', () => {
	it.each(CAS)('%s : %s', (_id, input, tidied, evaluated, latex) => {
		expect(toCustom(tidy(parseCustom(input)))).toBe(tidied);
		expect(evaluateAstWithModifiers(parseCustom(input))).toBe(evaluated);
		// L'Atelier ajoute l'unité dérivée à côté (« = 21600000 J ») : seul le début compte
		expect(latexOf(runInput(session(), input))?.startsWith(latex)).toBe(true);
	});

	it('type-16 : sans écriture décimale finie, la fraction la plus courte', () => {
		expect(toCustom(tidy(parseCustom('(1/3)[km]+1[m]')))).toBe('(1003/3)[m]');
	});

	it('type-22 : un terme à lettre impose son unité, rien ne change', () => {
		expect(toCustom(tidy(parseCustom('x[km]+500[m]')))).toBe('x[km]+0.5[km]');
	});

	it('type-23 : f(4) avec f(x) = 3000[m]·x, comme 3000[m]·4', () => {
		const calcul = session();
		runInput(calcul, 'f(x)=3000[m]*x');
		expect(latexOf(runInput(calcul, 'f(4)'))).toBe('12000~\\mathrm{m}');
	});

	it('type-24 : simplify garde l’unité tapée', () => {
		expect(toCustom(simplify(parseCustom('2500[mL]')).result)).toBe('2500[mL]');
	});
});

describe('durées en h-min-s : au niveau de tête seulement', () => {
	it.each([
		['2*(1[h] 30[min])', '3[h]'],
		['(1[h] 30[min])/2', '45[min]'],
		['-2[h] 30[min]', '-2[h] 30[min]'],
		['1[h]-3[h]-30[min]', '-2[h] 30[min]'],
		['1[min]+3540[s]', '1[h]']
	])('%s → %s', (input, expected) => {
		expect(toCustom(tidy(parseCustom(input)))).toBe(expected);
	});

	it('dans un quotient, la somme reste UNE grandeur : (2[h]+30[min])/1[s] → 9000', () => {
		expect(toCustom(tidy(parseCustom('(2[h]+30[min])/1[s]')))).toBe('9000');
	});

	it('`durations: single` : une seule grandeur, la règle commune', () => {
		const single = tidy(parseCustom('2[h]+30[min]'), { durations: 'single' });
		// 2,5 h : 2 chiffres, contre 3 pour 150 min
		expect(toCustom(single)).toBe('2.5[h]');
	});

	it('idempotent', () => {
		const once = tidy(parseCustom('1[h]+45[min]+30[min]'));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});

	it('{{eval}} : une durée négative reste UNE grandeur (`;hms` la refuserait)', () => {
		expect(evaluateAstWithModifiers(parseCustom('1[h]-3[h]-30[min]'))).toBe('-2.5[h]');
	});
});

describe('{{eval}} : une variable garde UNE grandeur (David, 2026-11-03)', () => {
	it('une durée calculée dans une variable se réutilise dans un produit', () => {
		const [t, u] = resolveVariables([
			{ name: 't', expression: '{{eval:1[h]+30[min]}}' },
			{ name: 'u', expression: '{{eval:{{t}}*2}}' }
		]);
		// 1,5 h ou 90 min : 2 chiffres partout, la plus petite unité
		expect(t.value).toBe('90[min]');
		expect(u.value).toBe('180[min]');
	});

	it.each([
		[{ addPositive: true }, '+90[min]'],
		[{ decimal: true }, '90[min]']
	])(
		'modificateur d’écriture %o : UNE grandeur, le modificateur appliqué',
		(modifiers, expected) => {
			expect(evaluateAstWithModifiers(parseCustom('1[h]+30[min]'), modifiers)).toBe(expected);
		}
	);
});

describe('case à unité imposée : l’attendu dans cette unité (David, 2026-11-03)', () => {
	it.each([
		['1.5[km]', 'm', '1500[m]'],
		['{1[h]}{30[min]}', 'h', '1.5[h]'],
		['{1[h]}{30[min]}', 'min', '90[min]'],
		['-1.5[km]', 'm', '-1500[m]'],
		['1500[m]', 'm', '1500[m]'],
		['(-3[m])', 'm', '(-3[m])'],
		['5[kg]', 'm', '5[kg]'],
		['7', 'm', '7'],
		['(1/3)[km]', 'm', '(1/3)[km]'],
		['(-3[km])', 'm', '(-3000[m])'],
		['+3[km]', 'm', '+3000[m]']
	])('%s, %s imposé → %s', (expected, required, rewritten) => {
		expect(expectedInRequiredUnit(expected, required)).toBe(rewritten);
	});

	it('la bonne réponse dans l’unité imposée est juste', () => {
		const expected = expectedInRequiredUnit('1.5[km]', 'm');
		expect(validateQuantityAnswer('1500\\unit{m}', expected, undefined, 'm').isCorrect).toBe(true);
		expect(validateQuantityAnswer('1{,}5\\unit{km}', expected, undefined, 'm').isCorrect).toBe(
			false
		);
	});
});

describe('Atelier, .simplifier : le passage en h-min-s est un geste (David, 2026-11-03)', () => {
	it('1[h]+30[min] : une étape, et la réponse 1 h 30 min', () => {
		const result = simplifySteps('1[h]+30[min]');
		expect(result).not.toBeNull();
		expect(result?.steps.length).toBeGreaterThan(0);
		expect(result?.answer).toContain('30');
	});
});
