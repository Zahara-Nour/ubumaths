/**
 * Question à bloc ```construction (case « figure ») : génération et jugement
 * de bout en bout (`docs/wip/geometrie-validation-progress.md` § 3 et § 4).
 *
 * Le bloc porte sa case, comme ```operation : `blanks[]` peut l'omettre. La
 * réponse attendue est symbolique (`droite(A;B)`) ; le juge lit les positions
 * dans le registre (inscrit ici comme à l'écran de l'élève).
 */
import { describe, it, expect } from 'vitest';
import '$lib/questions/construction/positions-setup';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { toPublicQuestion } from '$lib/questions/public-question';
import { validateTemplate } from '$lib/questions/validators/template-validator';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-construction',
		title: 'Tracer une droite',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CP'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const block = (...lines: string[]) =>
	[
		'```construction',
		'fenetre: 0 ; 10 ; 0 ; 6',
		'outils: droite',
		...lines,
		'---',
		'A = point({{xa}}, 2)',
		'B = point(7, 2)',
		'C = point(4, 5)',
		'```'
	].join('\n');

const CP059 = template({
	statement: `Trace la droite qui passe par les points A et B.\n\n${block('verifier: droite_par A ; B')}`,
	variables: [{ name: 'xa', expression: '1' }]
});

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('bloc ```construction : la case', () => {
	it('sans blanks[] : une case « figure », réponse attendue symbolique', () => {
		const instance = generate(CP059);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'graphical',
			expectedAnswer: 'droite(A;B)',
			construction: { checks: [{ kind: 'droite_par', points: ['A', 'B'], line: 3 }] }
		});
		// Le texte du bloc (variables résolues) voyage avec la case : le juge en tire les positions
		expect(instance.blanks?.[0].construction?.source).toContain('A = point(1, 2)');
		expect(String(instance.statement)).toContain('case: 0');
	});

	it('le modèle sans blanks[] est valide', () => {
		expect(validateTemplate(CP059)).toEqual([]);
	});

	it('une réponse écrite pour la case du bloc est refusée', () => {
		const result = generateInstance(
			template({
				statement: block('verifier: droite_par A ; B'),
				variables: [{ name: 'xa', expression: '1' }],
				blanks: [{ expectedAnswer: 'droite(A;B)' }]
			}),
			42
		);
		expect(result.success).toBe(false);
	});

	it('bloc en erreur : génération refusée, message situé', () => {
		const result = generateInstance(
			template({ statement: block(), variables: [{ name: 'xa', expression: '1' }] }),
			42
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.join(' ')).toContain('Vérification manquante');
		}
	});

	it('évaluation notée : la case publique ne porte que sa nature (jugée au serveur)', () => {
		const instance = generate(CP059);
		const publicQuestion = toPublicQuestion(instance, { position: 0, delaySeconds: 60 });
		expect(publicQuestion.blanks).toEqual([{ type: 'graphical' }]);
	});
});

describe('bloc ```construction : le jugement (validateAnswer)', () => {
	const instance = generate(CP059);
	const verdict = (answer: string) => validateAnswer([answer], instance);

	it('droite par A et B : juste', () => {
		expect(verdict('droite(1;2;7;2)').isCorrect).toBe(true);
	});

	it('droite par A et C : faux, message de la phase 0', () => {
		const result = verdict('droite(1;2;4;5)');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toContain('Ta droite passe par A et C, pas par B.');
	});

	it('droite en trop : faux', () => {
		const result = verdict('droite(1;2;7;2)|droite(0;0;1;1)');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toContain('Tu as tracé une droite de trop.');
	});

	it('rien tracé : vide', () => {
		expect(verdict('').isCorrect).toBe(false);
	});
});
