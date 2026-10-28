/**
 * Génération d'une question à bloc ```operation à remplir (PR 1b, phase 0 :
 * `docs/archive/wip/operations-posees-progress.md` § 9)
 *
 * Le bloc compte pour une case ; sa réponse attendue vient du calcul du bloc,
 * jamais du modèle ; elle passe au juge ordinaire.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-operation',
		title: 'Opération posée',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CE1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const op = (...body: string[]) => ['```operation', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('bloc ```operation : la case et sa réponse', () => {
	it('sans blanks[] : la case est créée, réponse calculée par le bloc (comportements 1-2)', () => {
		const instance = generate(
			template({ statement: `Pose l’addition.\n\n${op('calcul: 45 + 37')}` })
		);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'math',
			expectedAnswer: '82',
			operation: true
		});
		expect(String(instance.statement)).toContain('case: 0');
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: op('calcul: {{a}} + {{b}}'),
				variables: [
					{ name: 'a', expression: '45' },
					{ name: 'b', expression: '37' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('82');
	});

	it('décimaux : réponse sous sa forme la plus simple', () => {
		const instance = generate(template({ statement: op('calcul: 0,5 + 0,5') }));
		expect(instance.blanks?.[0].expectedAnswer).toBe('1');
		expect(
			generate(template({ statement: op('calcul: 56,75 + 234 + 0,8') })).blanks?.[0]
		).toMatchObject({
			expectedAnswer: '291.55',
			expectedAnswerLatex: '291{,}55'
		});
	});

	it('avec d’autres cases : blanks[] ne donne que les autres, la case du bloc est insérée à son rang (comportement 8)', () => {
		const instance = generate(
			template({
				statement: `$? + 1 = 3$\n\n${op('calcul: 45 + 37')}\n\nMot : [_]`,
				blanks: [{ expectedAnswer: '2' }, { expectedAnswer: 'addition' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['2', '82', 'addition']);
		expect(instance.blanks?.map((b) => b.type)).toEqual(['math', 'math', 'text']);
	});

	it('blanks[] complet : l’entrée du bloc, sans réponse, garde ses réglages (comportement 2)', () => {
		const instance = generate(
			template({
				statement: op('calcul: 45 + 37'),
				blanks: [{ expectedAnswer: '', precision: { type: 'none' } }]
			})
		);
		expect(instance.blanks?.[0]).toMatchObject({
			expectedAnswer: '82',
			precision: { type: 'none' }
		});
	});

	it('blanks[] complet avec une réponse écrite pour le bloc : refusé (une seule source)', () => {
		const result = generateInstance(
			template({ statement: op('calcul: 45 + 37'), blanks: [{ expectedAnswer: '82' }] }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*calcul.*bloc operation/i);
	});

	it('multiplication à remplir : une case, réponse calculée par le bloc (PR 2b, § 11 n° 1)', () => {
		const instance = generate(template({ statement: op('calcul: 548 × 16') }));
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'math',
			expectedAnswer: '8768',
			operation: true
		});
	});

	it('multiplication décimale : la valeur est jugée, virgule absente mais valeur juste → juste (§ 11 n° 10)', () => {
		const decimal = generate(template({ statement: op('calcul: 7 × 46,55') }));
		expect(validateAnswer('325{,}85', decimal, '325{,}85').status).toBe('correct');
		expect(validateAnswer('32\\,585', decimal, '32\\,585').isCorrect).toBe(false);
		const trailing = generate(template({ statement: op('calcul: 2,5 × 4') }));
		expect(validateAnswer('10', trailing, '10').status).toBe('correct');
	});

	it('multiplication résolue (cases: aucune) : acceptée, sans case', () => {
		const instance = generate(
			template({
				statement: `${op('calcul: 548 × 16', 'cases: aucune')}\n\n$? = 8768$`,
				blanks: [{ expectedAnswer: '8768' }]
			})
		);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0].operation).toBeUndefined();
	});

	it('division euclidienne à remplir : deux cases, quotient puis reste, calculés par le bloc (PR 3b, § 12 n° 4, Q2)', () => {
		const instance = generate(template({ statement: op('calcul: 9456 ÷ 7') }));
		expect(instance.blanks).toHaveLength(2);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['1350', '6']);
		expect(instance.blanks?.every((b) => b.type === 'math' && b.operation === true)).toBe(true);
		expect(String(instance.statement)).toContain('case: 0');
		expect(String(instance.statement)).not.toContain('case: 1');
	});

	it('division euclidienne avec d’autres cases : les deux cases du bloc insérées à leur rang', () => {
		const instance = generate(
			template({
				statement: `$? + 1 = 3$\n\n${op('calcul: 456 ÷ 7')}\n\nMot : [_]`,
				blanks: [{ expectedAnswer: '2' }, { expectedAnswer: 'division' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['2', '65', '1', 'division']);
		expect(String(instance.statement)).toContain('case: 1');
	});

	it('division euclidienne, blanks[] complet : deux entrées sans réponse pour le bloc', () => {
		const instance = generate(
			template({
				statement: op('calcul: 9 ÷ 1'),
				blanks: [{ expectedAnswer: '' }, { expectedAnswer: '' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['9', '0']);
	});

	it('division décimale à remplir : une seule case, le quotient (n° 7)', () => {
		const instance = generate(template({ statement: op('calcul: 785 ÷ 4', 'quotient: décimal') }));
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0]).toMatchObject({
			expectedAnswer: '196.25',
			expectedAnswerLatex: '196{,}25',
			operation: true
		});
		expect(generate(template({ statement: op('calcul: 148,2 ÷ 5') })).blanks).toHaveLength(1);
	});

	it('division décimale : le juge juge la valeur (`2,1` juste pour 4,20 ÷ 2 ; virgule absente → faux, Q6)', () => {
		const instance = generate(template({ statement: op('calcul: 4,20 ÷ 2') }));
		expect(validateAnswer('2{,}1', instance, '2{,}1').status).toBe('correct');
		expect(validateAnswer('21', instance, '21').isCorrect).toBe(false);
		const whole = generate(template({ statement: op('calcul: 8 ÷ 4', 'quotient: décimal') }));
		expect(whole.blanks?.[0].expectedAnswer).toBe('2');
	});

	it('division résolue (cases: aucune) : acceptée, sans case', () => {
		const instance = generate(
			template({
				statement: `${op('calcul: 9456 ÷ 7', 'cases: aucune')}\n\n$? = 1350$`,
				blanks: [{ expectedAnswer: '1350' }]
			})
		);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0].operation).toBeUndefined();
	});

	it('cases: aucune : pas de case', () => {
		const instance = generate(
			template({
				statement: `${op('calcul: 45 + 37', 'cases: aucune')}\n\n$? = 82$`,
				blanks: [{ expectedAnswer: '82' }]
			})
		);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0].operation).toBeUndefined();
	});
});

describe('bloc ```operation : le juge ordinaire (comportement 5)', () => {
	const instance = generate(template({ statement: op('calcul: 45 + 37') }));

	it('82 juste, 81 faux', () => {
		expect(validateAnswer('82', instance, '82').status).toBe('correct');
		expect(validateAnswer('81', instance, '81').isCorrect).toBe(false);
	});

	it('grille décimale 1,0 lue 1 : juste, sans remarque', () => {
		const decimal = generate(template({ statement: op('calcul: 0,5 + 0,5') }));
		expect(validateAnswer('1', decimal, '1').status).toBe('correct');
	});

	it('grand résultat lu avec ses espaces : juste, sans remarque', () => {
		const big = generate(template({ statement: op('calcul: 25000 + 5000') }));
		expect(validateAnswer('30\\,000', big, '30\\,000').status).toBe('correct');
	});
});

describe('bloc ```operation : erreurs (comportement 14)', () => {
	it('bloc en erreur dans une question : génération refusée, message situé', () => {
		const result = generateInstance(template({ statement: op('calcul: 4a + 2') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/bloc operation.*Ligne 1/);
	});

	it('bloc à remplir dans une liste : génération refusée', () => {
		const result = generateInstance(
			template({
				statement: ['- Pose :', '', '  ```operation', '  calcul: 45 + 37', '  ```'].join('\n')
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/premier niveau/);
	});
});

describe('bloc ```operation : validation du modèle', () => {
	it('seul bloc en cases: aucune, sans blanks[] : toujours une case manquante', () => {
		const result = generateInstance(
			template({ statement: op('calcul: 45 + 37', 'cases: aucune') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/fill_in_blanks requires blanks/);
	});
});

describe('bloc ```operation : revue #1726', () => {
	it('carte de cours avec un bloc : aucune case', () => {
		const t = {
			...template({ statement: op('calcul: 45 + 37'), correction: { steps: ['82'] } } as never),
			options: { courseCard: true }
		} as QuestionTemplate;
		const result = generateInstance(t, 42);
		if (result.success) expect(result.instance.blanks ?? []).toEqual([]);
	});

	it('case: écrite par l’auteur : refusée avec un message (jamais de case morte)', () => {
		const result = generateInstance(template({ statement: op('case: 3', 'calcul: 45 + 37') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case: est posée automatiquement/);
	});

	it('entrée du bloc sans expectedAnswer (jsonb) : acceptée', () => {
		const instance = generate(
			template({ statement: op('calcul: 45 + 37'), blanks: [{} as never] })
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('82');
	});

	it('énoncé partagé portant le bloc, sans blanks : valide', () => {
		const t = {
			...template({ statement: '' }),
			shared: { statement: templateMarkdown(op('calcul: 45 + 37')) },
			variations: [{}]
		} as unknown as QuestionTemplate;
		expect(generate(t).blanks?.[0].expectedAnswer).toBe('82');
	});
});
