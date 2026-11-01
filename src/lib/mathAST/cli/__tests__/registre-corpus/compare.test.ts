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

	it('compare un refus à son message, et repère une réponse là où un refus est attendu', () => {
		const c: RegistreCase = { id: 't', ligne: '', attendu: 'Non.', refus: true };
		expect(describeVerdict(judge(c, { kind: 'refus', message: 'Non.' }))).toBe('juste');
		expect(describeVerdict(judge(c, { kind: 'refus', message: 'Autre.' }))).toBe(
			'message : Autre.'
		);
		expect(describeVerdict(judge(c, { kind: 'reponse', latex: '1' }))).toBe('accepte : 1');
	});
});
