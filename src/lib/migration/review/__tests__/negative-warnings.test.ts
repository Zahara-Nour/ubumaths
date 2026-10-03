/**
 * Avertissement : variable qui peut être négative, citée sans parenthèses (2026-10-03)
 *
 * Décision de David : la substitution `{{a}}` ne change pas (des modèles écrivent
 * `{{a}}x{{b}}` en comptant sur le signe de b), mais `checkTemplate` (donc
 * `pnpm question:specs`) AVERTIT l'auteur quand le rendu est faux ou ambigu :
 * `-3^2`, `2-3` (produit lu comme une soustraction), `x--3`, `5\times-3`.
 * Un avertissement ne change jamais le verdict.
 */
import { describe, it, expect } from 'vitest';
import { checkTemplate, formatCheckReport } from '../check-template';
import type { QuestionTemplate } from '$lib/questions/types';

/** QCM minimal : la formule à vérifier est dans l'énoncé */
function qcm(
	formule: string,
	variables: { name: string; expression: string }[] = [{ name: 'a', expression: '-9..-1' }],
	extra: Record<string, unknown> = {}
): QuestionTemplate {
	return {
		id: 't',
		title: 't',
		grades: ['2'],
		theme: 'T',
		domain: 'D',
		level: 1,
		status: 'draft',
		variations: [
			{
				statement: `Que vaut ${formule} ?`,
				variables,
				choices: [
					{ content: 'oui', isCorrect: true },
					{ content: 'non', isCorrect: false }
				],
				correctChoiceIndex: '0',
				...extra
			}
		]
	} as unknown as QuestionTemplate;
}

const warningsOf = (template: QuestionTemplate) =>
	checkTemplate(template, { instances: 20 }).warnings;

describe('avertissement « valeur négative sans parenthèses » — cas signalés', () => {
	it.each([
		['soustraction', '$x-{{a}}$', 'x--'],
		['addition', '$x+{{a}}$', 'x+-'],
		['multiplication \\times', '$5\\times{{a}}$', '5\\times-'],
		['multiplication \\times espacée', '$5\\times {{a}}$', '5\\times -'],
		['multiplication *', '$5*{{a}}$', '5*-'],
		['exposant', '$2^{{a}}$', '2^-'],
		['moins devant', '$-{{a}}$', '--'],
		['puissance d’un négatif', '${{a}}^2$', '^2']
	])('%s : %s', (_cas, formule, rendu) => {
		const warnings = warningsOf(qcm(formule));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('{{a}}');
		expect(warnings[0]).toContain('{{a;()}}');
		expect(warnings[0]).toContain(rendu);
	});

	it('formule maison ~…~ : signalée aussi', () => {
		expect(warningsOf(qcm('~x-{{a}}~'))).toHaveLength(1);
	});

	it('produit implicite (chiffre ou lettre collé) quand a prend les deux signes', () => {
		const both = [{ name: 'a', expression: '-5..5!0' }];
		const chiffre = warningsOf(qcm('$2{{a}}$', both));
		expect(chiffre).toHaveLength(1);
		expect(chiffre[0]).toMatch(/2-\d/);
		expect(chiffre[0]).toContain('{{a;+}}');
		expect(warningsOf(qcm('$x{{a}}$', both))).toHaveLength(1);
	});

	it('valeur calculée négative sur des tirages (variable `eval:`)', () => {
		const vars = [
			{ name: 'n', expression: '1..5' },
			{ name: 'a', expression: 'eval:n-10' }
		];
		expect(warningsOf(qcm('$x-{{a}}$', vars))).toHaveLength(1);
	});

	it('réponse attendue : `{{a}}^2` se lit -(3²)', () => {
		const template = qcm('$x$', [{ name: 'a', expression: '-9..-1' }], {
			statement: 'Calcule $?$.',
			choices: undefined,
			correctChoiceIndex: undefined,
			blanks: [{ expectedAnswer: '{{a}}^2' }]
		});
		expect(warningsOf(template)).toHaveLength(1);
	});

	it('correction : signalée aussi', () => {
		const template = qcm('$x$', undefined, {
			correction: { steps: ['On calcule $3\\times{{a}}$.'] }
		});
		expect(warningsOf(template)).toHaveLength(1);
	});

	it('un avertissement ne change pas le verdict, et le rapport l’affiche', () => {
		const report = checkTemplate(qcm('$x-{{a}}$'), { instances: 20 });
		const sans = checkTemplate(qcm('$x-{{a;()}}$'), { instances: 20 });
		expect(report.passed).toBe(sans.passed);
		expect(report.reasons).toEqual(sans.reasons);
		expect(formatCheckReport(report)).toMatch(/Avertissement : /);
	});

	it('une seule fois par citation, même sur 20 tirages', () => {
		expect(warningsOf(qcm('$x-{{a}}$ et $y-{{a}}$'))).toHaveLength(2);
	});
});

describe('avertissement « valeur négative sans parenthèses » — cas non signalés', () => {
	it.each([
		['variable toujours positive', '$x-{{a}}$', [{ name: 'a', expression: '1..9' }]],
		['parenthèses à la demande', '$x-{{a;()}}$', undefined],
		['signe explicite', '${{a}}x{{a;+}}y$', undefined],
		['eval', '$x-{{eval:a}}$', undefined],
		['entre parenthèses', '$({{a}})^2$', undefined],
		['après =', '$x={{a}}$', undefined],
		['dans une fraction', '$\\dfrac{ {{a}} }{2}$', undefined],
		['exposant entre accolades', '$x^{ {{a}} }$', undefined],
		['degrés', '${{a}}^\\circ$', undefined],
		['texte hors formule', 'le nombre -{{a}}', undefined],
		// Terme signé : b toujours négatif, l'auteur compte sur son signe (`3x^2-4x`)
		['terme signé toujours négatif', '$3x^2{{a}}x$', undefined],
		['facteur en tête', '${{a}}x+1$', undefined]
	])('%s : %s', (_cas, formule, variables) => {
		expect(warningsOf(qcm(formule, variables))).toEqual([]);
	});
});
