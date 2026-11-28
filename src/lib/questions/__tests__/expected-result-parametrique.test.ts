/**
 * Verso d'une case « droite paramétrique » (outil 64) : la réponse de l'élève, relue
 * par le professeur, rendue en système sans dépasser les bornes d'une réponse
 * ordinaire (audit de sécurité de l'outil 64).
 */
import { describe, it, expect } from 'vitest';
import { parametricStudentLatex } from '../expected-result';
import { formatParametricAnswer } from '../parametric/parametric-lines';

describe('parametricStudentLatex', () => {
	it('trois lignes : un système', () => {
		expect(parametricStudentLatex(formatParametricAnswer(['1+2t', '2', '-1+3t']))).toBe(
			'\\begin{cases}x=1+2t\\\\y=2\\\\z=-1+3t\\end{cases}'
		);
	});

	it('rien d’écrit : null', () => {
		expect(parametricStudentLatex(formatParametricAnswer(['', '', '']))).toBeNull();
	});

	it('bornes mesurées sur la réponse entière : trois lignes longues → texte inerte', () => {
		const line = '1+' + Array.from({ length: 70 }, () => '\\frac{1}{2}').join('+') + 't';
		expect(line.length).toBeLessThan(1000);
		expect(line.length * 3).toBeGreaterThan(1000);
		const latex = parametricStudentLatex(formatParametricAnswer([line, line, line]));
		expect(latex).not.toContain('\\begin{cases}');
		expect(latex?.startsWith('\\text{')).toBe(true);
	});

	it('une 4e ligne n’est pas cachée au professeur', () => {
		const latex = parametricStudentLatex('x=1+2t\\\\y=2\\\\z=-1+3t\\\\w=caché');
		expect(latex).not.toContain('\\begin{cases}');
		expect(latex).toContain('w');
	});

	it('les & ne deviennent pas des colonnes', () => {
		const latex = parametricStudentLatex(formatParametricAnswer(['1&2t', '2', '-1+3t']));
		expect(latex).toContain('x=1\\&2t');
	});
});
