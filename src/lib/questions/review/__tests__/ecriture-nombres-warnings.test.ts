/**
 * Avertissements d'écriture des nombres (2026-11-26)
 *
 * `checkTemplate` (donc `pnpm question:specs`) avertit l'auteur, sans changer le verdict :
 * (a) des euros qui gardent plus de deux décimales sans `;aN` / `;pN` ;
 * (b) `;dN` sur une valeur qui a plus de N décimales ;
 * (c) une réponse attendue arrondie (`;aN`, `;pN`) dans une case sans `precision`.
 */
import { describe, it, expect } from 'vitest';
import { checkTemplate } from '../check-template';
import type { QuestionTemplate } from '#lib/questions/types.ts';

function template(
	statement: string,
	expectedAnswer: string,
	blank: Record<string, unknown> = {}
): QuestionTemplate {
	return {
		id: 't',
		title: 't',
		grades: ['6'],
		level: 1,
		status: 'draft',
		variations: [
			{
				statement: `${statement} $?$`,
				variables: [{ name: 'x', expression: '3.755' }],
				blanks: [{ expectedAnswer, ...blank }]
			}
		],
		testSpecs: [
			{
				description: 'juste',
				variables: { x: '3.755' },
				answers: ['1'],
				expected: { status: 'correct' }
			}
		]
	} as unknown as QuestionTemplate;
}

const reportOf = (t: QuestionTemplate) => checkTemplate(t, { instances: 3 });

describe('avertissements d’écriture des nombres', () => {
	it('(a) euros au-delà du centime, sans arrondi : signalé une fois', () => {
		const warnings = reportOf(template('${{eval:(x)[€]}}$', '1')).warnings;
		expect(warnings.filter((w) => w.includes('centime'))).toHaveLength(1);
		expect(warnings[0]).toContain('3.755[€]');
	});

	it('(a) euros arrondis : rien', () => {
		const warnings = reportOf(
			template('${{eval:(x)[€];a2}}$', '1', { precision: { type: 'decimal', digits: 2 } })
		).warnings;
		expect(warnings).toEqual([]);
	});

	it('(b) ;d2 sur une valeur à 3 décimales : signalé', () => {
		const warnings = reportOf(template('${{eval:x;d2}}$', '1')).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(';d2');
		expect(warnings[0]).toContain('3.755');
	});

	it('(c) réponse attendue arrondie, case sans précision : signalé', () => {
		const warnings = reportOf(template('$x$', '{{eval:x;a2}}')).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('la case n’a pas de précision');
	});

	it('(c) précision donnée dans la case ou dans blankDefaults : rien', () => {
		expect(
			reportOf(template('$x$', '{{eval:x;p2}}', { precision: { type: 'significant', digits: 2 } }))
				.warnings
		).toEqual([]);
		const withDefaults = template('$x$', '{{eval:x;a2}}');
		withDefaults.variations[0].blankDefaults = { precision: { type: 'decimal', digits: 2 } };
		expect(reportOf(withDefaults).warnings).toEqual([]);
	});

	it('un avertissement ne change pas le verdict', () => {
		const report = reportOf(template('${{eval:(x)[€]}}$', '1'));
		expect(report.warnings.length).toBeGreaterThan(0);
		expect(report.passed).toBe(true);
	});
});

describe('avertissements d’écriture : relecture du 2026-11-26', () => {
	it('un tirage rejeté par une condition ne dépose pas d’avertissement', () => {
		const t = template('${{y}}$', '1');
		t.variations[0].variables = [
			{ name: 'x', expression: '1..2' },
			{ name: 'y', expression: '{{eval:(x+0.005*(x-1))[€]}}' }
		];
		t.variations[0].conditions = ['x == 1'];
		const report = checkTemplate(t, { instances: 20 });
		expect(report.generation.failures).toEqual([]);
		expect(report.warnings).toEqual([]);
	});

	it('(c) ;dN dans la réponse attendue, case sans précision : signalé', () => {
		const warnings = reportOf(template('$x$', '{{eval:2*x;d4}}')).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('décimales imposées dans la réponse attendue');
		expect(warnings[0]).toContain('forme à améliorer');
	});

	it.each([
		['{{eval:x;a2}}', 'arrondi dans la réponse attendue'],
		['{{eval:x;p2}}', 'arrondi dans la réponse attendue'],
		['{{eval:2*x;d4}}', 'décimales imposées']
	])('(c) variable %s citée par {{p}} dans l’attendu : signalé', (expression, message) => {
		const t = template('$x$', '{{p}}');
		t.variations[0].variables = [
			{ name: 'x', expression: '3.755' },
			{ name: 'p', expression }
		];
		const warnings = reportOf(t).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(message);
		expect(warnings[0]).toContain('{{p}}');
	});

	it('euro avec ;dN : pas d’avertissement « au-delà du centime »', () => {
		expect(reportOf(template('${{eval:3.7[€];d3}}$', '1')).warnings).toEqual([]);
		const warnings = reportOf(template('${{eval:3.755[€];d2}}$', '1')).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(';d2');
	});
});
