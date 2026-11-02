/**
 * Le juge du corpus du registre, et le corpus lui-même (identifiants uniques,
 * attendus lisibles).
 */

import { describe, it, expect } from 'vitest';
import { REGISTRE_CASES } from '../../../../../../tests/fixtures/mathast/registre-corpus';
import type { RegistreCase } from '../../../../../../tests/fixtures/mathast/registre-corpus';
import { judge, expectedProblem } from './compare';
import { describeVerdict } from './harness';

function verdictOf(attendu: string, latex: string): string {
	const c: RegistreCase = { id: 't', ligne: '', attendu };
	return describeVerdict(judge(c, { kind: 'reponse', latex }));
}

describe('Le corpus du registre', () => {
	it('a des identifiants uniques', () => {
		const ids = REGISTRE_CASES.map((c) => c.id);
		expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
	});

	it('a des attendus lisibles', () => {
		const problems = REGISTRE_CASES.map((c) => [c.id, expectedProblem(c)]).filter(
			([, p]) => p !== null
		);
		expect(problems).toEqual([]);
	});
});

describe('Le juge du corpus', () => {
	it('accepte une écriture cosmétiquement différente', () => {
		expect(verdictOf('(x+1)e^x', '\\left( x + 1 \\right) \\exponentialE^x')).toBe('juste');
		expect(verdictOf('\\ln|x| + C', '\\ln\\left( \\left| x \\right| \\right) + C')).toBe('juste');
		expect(verdictOf('0,75', '0{,}75')).toBe('juste');
	});

	it('distingue une autre écriture (forme) d’une autre valeur', () => {
		expect(verdictOf('(x+1)e^x', 'e^x + x e^x')).toBe('forme : e^x + x e^x');
		expect(verdictOf('(x+1)e^x', '(x+2)e^x')).toBe('valeur : (x+2)e^x');
		// La constante est une lettre à part : F seule n'est pas F + C
		expect(verdictOf('x^3 + C', 'x^3')).toBe('valeur : x^3');
	});

	it('juge un ensemble élément par élément, crochets compris', () => {
		expect(verdictOf('S = ]-\\infty ; 3[', 'S = ]-\\infty ; 3[')).toBe('juste');
		expect(verdictOf('S = ]-\\infty ; 3[', 'S = ]-\\infty ; 3]')).toBe(
			'valeur : S = ]-\\infty ; 3]'
		);
		expect(verdictOf('S = \\{-2 ; 1\\}', 'S = \\left\\{ -2 \\,;\\, 1 \\right\\}')).toBe('juste');
		expect(verdictOf('S = \\{-2 ; 1\\}', 'S = \\{1 ; -2\\}')).toBe('forme : S = \\{1 ; -2\\}');
		expect(verdictOf('S = \\{-2 ; 1\\}', 'S = \\{-2 ; 3\\}')).toBe('valeur : S = \\{-2 ; 3\\}');
		expect(verdictOf('S = \\{3\\}', 'x = 3')).toBe('structure : x = 3');
		expect(
			verdictOf(
				'D = \\mathbb{R} \\setminus \\{0\\}',
				'D = \\mathbb{R} \\setminus \\left\\{0\\right\\}'
			)
		).toBe('juste');
	});

	it('juge une grandeur et un angle : même unité, puis le nombre', () => {
		expect(verdictOf('12000~\\mathrm{m}', '12000~\\unit{m}')).toBe('juste');
		expect(verdictOf('12.5~\\mathrm{km}', '12{,}5~\\mathrm{km}')).toBe('juste');
		expect(verdictOf('6~\\mathrm{km}^{2}', '6~\\unit{km^2}')).toBe('juste');
		expect(verdictOf('\\dfrac{1}{3}~\\mathrm{km}', '\\frac{1}{3}~\\mathrm{km}')).toBe('juste');
		// Même valeur, autre unité : une autre réponse
		expect(verdictOf('12~\\mathrm{km}', '12000~\\mathrm{m}')).toBe('valeur : 12000~\\mathrm{m}');
		expect(verdictOf('90{}^{\\circ}', '90^{\\circ}')).toBe('juste');
		expect(verdictOf('90{}^{\\circ}', '90°')).toBe('juste');
		expect(verdictOf('90{}^{\\circ}', '90')).toBe('valeur : 90');
	});

	it('lit une factorielle sans la calculer', () => {
		expect(verdictOf('1000!', '1000!')).toBe('juste');
		expect(verdictOf('1000!', '999!')).toBe('valeur : 999!');
	});

	it('juge l’écriture décimale une fois la réponse juste', () => {
		const c: RegistreCase = {
			id: 't',
			ligne: '',
			attendu: '\\dfrac{5}{6}',
			decimal: '0.8333',
			decimalExact: false
		};
		const answer = (decimal?: string) =>
			describeVerdict(
				judge(c, { kind: 'reponse', latex: '\\frac{5}{6}', decimal }, { decimalRequired: true })
			);
		expect(answer('\\approx 0{,}8333')).toBe('juste');
		expect(answer('\\approx 0.8333')).toBe('juste');
		expect(answer('\\approx 0\\text{,}8333')).toBe('juste');
		expect(answer('= 0.8333')).toBe('décimal : = 0.8333');
		expect(answer('\\approx 0.833')).toBe('décimal : \\approx 0.833');
		expect(answer()).toBe('décimal : absente');
		// Un outil qui habille n'est jugé que s'il affiche l'écriture
		expect(describeVerdict(judge(c, { kind: 'reponse', latex: '\\frac{5}{6}' }))).toBe('juste');
		const big: RegistreCase = {
			id: 't',
			ligne: '',
			attendu: '1000!',
			decimal: '4.0239*10^2567',
			decimalExact: false
		};
		expect(
			describeVerdict(
				judge(big, {
					kind: 'reponse',
					latex: '1000!',
					decimal: '\\approx 4{,}0239 \\times 10^{2567}'
				})
			)
		).toBe('juste');
	});

	it('lit `\\mathrm{e}` et `\\mathrm{i}` comme des constantes, pas des unités', () => {
		expect(verdictOf('2\\mathrm{e}^{2}', '2e^{2}')).toBe('juste');
		expect(verdictOf('3\\mathrm{i}', '3i')).toBe('juste');
	});

	it('repère une écriture décimale attendue illisible, quelle que soit la réponse', () => {
		const bad = (attendu: string) =>
			expectedProblem({ id: 't', ligne: '', attendu, decimal: 'zz' });
		expect(bad('12~\\mathrm{km}')).toBe('écriture décimale illisible : zz');
		expect(bad('S = \\{1\\}')).toBe('écriture décimale illisible : zz');
		expect(bad('\\text{vrai}')).toBe('écriture décimale illisible : zz');
	});

	it('compare un refus à son message, et repère une réponse là où un refus est attendu', () => {
		const c: RegistreCase = { id: 't', ligne: '', attendu: 'Non.', refus: true };
		expect(describeVerdict(judge(c, { kind: 'refus', message: 'Non.' }))).toBe('juste');
		expect(describeVerdict(judge(c, { kind: 'refus', message: 'Autre.' }))).toBe(
			'message : Autre.'
		);
		expect(describeVerdict(judge(c, { kind: 'reponse', latex: '1' }))).toBe('accepte : 1');
	});
});
