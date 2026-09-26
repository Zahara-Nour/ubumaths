/**
 * Couleurs dans un groupe LaTeX : `\textcolor{{{color:primary.0}}}{…}`
 * ===================================================================
 *
 * Forme produite par la conversion des corrections TinyMath (`${get(color1)}`) :
 * l'accolade du `\textcolor` colle au `{{color:…}}`. Le tokenizer lisait
 * `{{{color:…}}}` comme un tirage (« Failed to parse random spec ») : ~190
 * variations en échec. `{{{a}}}` (variable) fonctionnait déjà.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

function statementOf(statement: string): string {
	const template: QuestionTemplate = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1,
		variations: [
			{
				statement: templateMarkdown(`${statement} $?$`),
				variables: [{ name: 'a', expression: '3' }],
				blanks: [{ expectedAnswer: '3' }]
			}
		]
	};
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return String(result.instance.statement);
}

describe('couleur collée à une accolade LaTeX', () => {
	it('\\textcolor{{{color:primary.0}}}{…} : couleur résolue', () => {
		const statement = statementOf('$\\textcolor{{{color:primary.0}}}{{{a}}}$');
		expect(statement).toContain('\\textcolor{#FF5722}{3}');
		expect(statement).not.toContain('color:');
	});

	it('forme espacée inchangée', () => {
		expect(statementOf('$\\textcolor{ {{color:primary.1}} }{x}$')).toContain('#2196F3');
	});

	it('variable dans un groupe inchangée : \\frac{{{a}}}{2}', () => {
		expect(statementOf('$\\frac{{{a}}}{2}$')).toContain('\\frac{3}{2}');
	});
});
