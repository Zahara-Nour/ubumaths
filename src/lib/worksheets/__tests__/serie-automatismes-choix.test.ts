/**
 * Série d'automatismes : case « choix » (chantier figure-et-choix § 2.1)
 * =====================================================================
 *
 * Comme un QCM : `**a)** … **b)** …` à la place du bloc dans l'énoncé (ordre
 * AFFICHÉ), `Réponse : **b)** …` au corrigé ; le bloc compte pour une case.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie, BLANK_TEXT } from '../serie-automatismes';

const base = {
	title: 't',
	grades: ['6'],
	theme: 'T',
	domain: 'D',
	level: 1,
	status: 'draft'
} as const;

const alignes = {
	...base,
	id: 'alignes',
	variations: [
		{
			statement: 'Les points sont-ils alignés ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```',
			blanks: [{ expectedAnswer: '1' }]
		}
	]
} as unknown as QuestionTemplate;

const mixte = {
	...base,
	id: 'mixte',
	variations: [
		{
			statement:
				'Calcule $2+{{a}}=?$.\n\nLe résultat est-il pair ?\n\n```choix\nplusieurs: oui\nmelanger: non\n- pair\n- impair\n- multiple de ${{a}}$\n```\n\nFin.',
			variables: [{ name: 'a', expression: '4' }],
			blanks: [{ expectedAnswer: '{{eval:2+a}}' }, { expectedAnswer: '0;2' }]
		}
	]
} as unknown as QuestionTemplate;

const melange = {
	...base,
	id: 'melange',
	variations: [
		{
			statement: 'Choisis.\n\n```choix\n- A\n- B\n- C\n- D\n```',
			blanks: [{ expectedAnswer: '3' }]
		}
	]
} as unknown as QuestionTemplate;

const modeles = new Map([alignes, mixte, melange].map((t) => [t.id, t]));

describe('buildSerie — case choix', () => {
	it('énoncé : la liste a) b) à la place du bloc ; corrigé : la bonne réponse', () => {
		const serie = buildSerie(modeles, [{ templateId: 'alignes', seed: 1 }]);
		expect(serie.statement).toContain('**a)** Oui');
		expect(serie.statement).toContain('**b)** Non');
		expect(serie.statement).not.toContain('```choix');
		expect(serie.solution).toContain('Réponse : **b)** Non');
		expect(serie.solution).not.toContain('```choix');
	});

	it('question mixte : chaque case à sa place, plusieurs bonnes réponses', () => {
		const serie = buildSerie(modeles, [{ templateId: 'mixte', seed: 1 }]);
		expect(serie.statement).toContain(`\\text{${BLANK_TEXT}}`);
		expect(serie.statement).toContain('**c)** multiple de $4$');
		expect(serie.solution).toContain('\\mathbf{6}');
		expect(serie.solution).toContain('Réponse : **a)** pair ; **c)** multiple de $4$');
		// La liste reste avant « Fin. » (à la place du bloc)
		expect(serie.solution.indexOf('Réponse :')).toBeLessThan(serie.solution.indexOf('Fin.'));
	});

	it('mélange : lettres dans l’ordre affiché, réponse en lettre affichée', () => {
		const serie = buildSerie(modeles, [{ templateId: 'melange', seed: 5 }]);
		const lettres = [...serie.statement.matchAll(/\*\*([a-d])\)\*\* ([A-D])/g)].map((m) => m[2]);
		expect([...lettres].sort()).toEqual(['A', 'B', 'C', 'D']);
		const lettreDeD = String.fromCharCode(97 + lettres.indexOf('D'));
		expect(serie.solution).toContain(`Réponse : **${lettreDeD})** D`);
	});
});
