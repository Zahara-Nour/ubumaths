/**
 * Accolade LaTeX collée à un marqueur : `\dfrac{{{a}}\textcolor{…}{…}}`
 * ====================================================================
 *
 * Face à `{{{`, la PREMIÈRE accolade est un groupe LaTeX si ce qui suit
 * (`{{a}}`, `{{eval:…}}`, `{{color:…}}`) est un marqueur complet. Avant, tout
 * le bloc était lu comme un tirage (« Failed to parse random spec », #385).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

const B = String.fromCharCode(92);

function statementOf(statement: string): string {
	const template: QuestionTemplate = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['5'],
		theme: 'T',
		domain: 'D',
		level: 1,
		variations: [
			{
				statement: templateMarkdown(`${statement} $?$`),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'd', expression: '4' }
				],
				blanks: [{ expectedAnswer: '1' }]
			}
		]
	};
	const generated = generateInstance(template, 1);
	if (!generated.success) throw new Error(generated.errors.join('; '));
	return String(generated.instance.statement);
}

describe('accolade LaTeX devant un marqueur', () => {
	it('\\dfrac{{{a}}\\textcolor{{{color:…}}}{\\times {{d}}}}{2}', () => {
		const s = statementOf(
			`$${B}dfrac{{{a}}${B}textcolor{{{color:primary.1}}}{${B}times {{d}}}}{2}$`
		);
		expect(s).toContain(`${B}dfrac{3${B}textcolor{#2196F3}{${B}times 4}}{2}`);
	});

	it('\\dfrac{{{eval:a*2}}}{{{eval:d+1}}}', () => {
		expect(statementOf(`$${B}dfrac{{{eval:a*2}}}{{{eval:d+1}}}$`)).toContain(`${B}dfrac{6}{5}`);
	});

	it('inchangés : \\frac{{{a}}}{2} et un tirage à borne calculée', () => {
		expect(statementOf(`$${B}frac{{{a}}}{2}$`)).toContain(`${B}frac{3}{2}`);
	});
});
