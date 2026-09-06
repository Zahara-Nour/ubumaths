import { describe, expect, it } from 'vitest';
import { asGradeLevels, toQuestionTemplate } from '../question-template';
import type { QuestionTemplateRow } from '../question-template';

/**
 * `question_templates` garde ses variations, ses réglages et ses spécifications
 * de test en `jsonb`, et son statut comme du texte libre. Chaque page castait
 * la ligne pour la faire passer pour un `QuestionTemplate` : un statut inconnu
 * passait alors tel quel, et une variation absente devenait `undefined` là où
 * le générateur attend un tableau.
 */
const ligne = (surcharge: Partial<QuestionTemplateRow> = {}): QuestionTemplateRow => ({
	id: 'modele-1',
	title: 'Résoudre une équation',
	description: null,
	theme: 'Algèbre',
	domain: 'Équations',
	subdomain: null,
	level: 3,
	status: 'published',
	grades: ['3'],
	delay: null,
	variations: [{ statement: 'Résoudre $x + 1 = 0$' }],
	shared: null,
	options: null,
	default_display_options: null,
	test_specs: null,
	multiple_answers: null,
	exercise_instruction: null,
	created_at: null,
	updated_at: null,
	created_by: null,
	...surcharge
});

describe('toQuestionTemplate', () => {
	it('conserve un modèle publié', () => {
		const modele = toQuestionTemplate(ligne());

		expect(modele.status).toBe('published');
		expect(modele.variations).toHaveLength(1);
		expect(modele.grades).toEqual(['3']);
	});

	it('retient un statut inconnu du côté brouillon', () => {
		// Un statut que l'application ne connaît pas ne doit pas ouvrir l'accès
		// élève : le modèle reste hors de portée jusqu'à décision explicite.
		expect(toQuestionTemplate(ligne({ status: 'en_relecture' })).status).toBe('draft');
	});

	it('rend un tableau vide quand les variations ne sont pas une liste', () => {
		// La colonne est NOT NULL mais de forme libre. Le générateur itère
		// dessus : un objet le ferait échouer au lieu d'afficher « aucune
		// variation ».
		expect(toQuestionTemplate(ligne({ variations: { statement: 'x' } })).variations).toEqual([]);
	});

	it('traduit les absences Postgres en absences TypeScript', () => {
		const modele = toQuestionTemplate(ligne());

		expect(modele.description).toBeUndefined();
		expect(modele.subdomain).toBeUndefined();
		expect(modele.delay).toBeUndefined();
		expect(modele.shared).toBeUndefined();
		expect(modele.testSpecs).toBeUndefined();
		expect(modele.created_by).toBeUndefined();
	});

	it('mappe les colonnes snake_case sur les champs camelCase', () => {
		const modele = toQuestionTemplate(
			ligne({
				exercise_instruction: 'Calculer',
				multiple_answers: true,
				default_display_options: { shuffleTerms: true }
			})
		);

		expect(modele.exerciseInstruction).toBe('Calculer');
		expect(modele.multipleAnswers).toBe(true);
		expect(modele.defaultDisplayOptions).toEqual({ shuffleTerms: true });
	});
});

describe('asGradeLevels', () => {
	it('écarte un niveau que l’application ne connaît pas', () => {
		// `grades` est un `text[]` : un niveau inventé se glisserait sinon dans
		// `GradeLevel[]` et ferait échouer les filtres qui s'appuient dessus.
		expect(asGradeLevels(['3', 'CP', 'seconde-euro'])).toEqual(['3', 'CP']);
	});

	it('rend un tableau vide sur une colonne absente', () => {
		expect(asGradeLevels(null)).toEqual([]);
	});
});
