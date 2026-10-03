import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

// Un coefficient nul écrit avec « ;+ » ne doit pas se coller au terme précédent
function template(statement: string, expectedAnswer: string): QuestionTemplate {
	return {
		title: 'plus zéro',
		description: 'test',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		subdomain: 'S',
		level: 1,
		status: 'draft',
		variations: [
			{
				statement,
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'c', expression: '0' }
				],
				blanks: [{ expectedAnswer }],
				correction: { steps: ['x'] }
			}
		]
	} as unknown as QuestionTemplate;
}

describe('« ;+ » sur une valeur nulle', () => {
	it('écrit +0 dans l énoncé et la réponse attendue (pas « y0 »)', () => {
		const result = generateInstance(
			template('$d : {{a}}x-y{{c;+}}=0$\n\n$?$', '{{a}}x-y{{c;+}}=0'),
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(String(result.instance.statement)).not.toMatch(/y\s*0/);
		expect(result.instance.blanks?.[0]?.expectedAnswer).toBe('2x-y+0=0');
	});
	it('fait de même avec eval', () => {
		const result = generateInstance(template('$x{{eval:a-2;+}}$\n\n$?$', 'x{{eval:a-2;+}}'), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks?.[0]?.expectedAnswer).toBe('x+0');
	});
});
