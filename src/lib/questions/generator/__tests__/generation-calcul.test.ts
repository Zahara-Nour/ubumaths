/**
 * Question « programme de calcul » (bloc ```calcul, 5e ; chantier `blockly`, PR 5 ; journal
 * `docs/wip/blockly-progress.md`)
 *
 * Une case par bloc, réponse attendue = les nombres d'essai et le programme de référence
 * (`−3 ; 0 ; … | afficher (nombre + 2) × 4`), jamais écrite dans le modèle ; la réponse de
 * l'élève (son programme en notation texte) est rejouée sur chaque essai et jugée sur ce qu'elle
 * affiche.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult, EMPTY_PROGRAM_TEXT } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { parseCalculContent } from '$lib/ubumark/parser/calcul-parser';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-calcul',
		title: 'Programme de calcul',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['5'],
		level: 1
	} as QuestionTemplate;
}

const calcul = (...body: string[]) => ['```calcul', ...body, '```'].join('\n');
const BO = 'afficher (nombre + 2) × 4';
const ATTENDU = `attendu: ${BO}`;
const DEFAUT = '−3 ; 0 ; 1 ; 2 ; 5 ; 10 ; 0,5';
const DEVELOPPE = 'afficher nombre × 4 + 8';
const EN_ETAPES = 'résultat = nombre + 2 ; résultat = résultat × 4 ; afficher résultat';

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	expect(result.success).toBe(false);
	return result.success ? '' : result.errors.join(' ; ');
}

describe('assignBlankIndices — programme de calcul', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(calcul(ATTENDU));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(calcul('case: 0', ATTENDU));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'calcul', source: ATTENDU } });
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = ['- Programme :', '', '  ```calcul', `  ${ATTENDU}`, '  ```'].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Un programme de calcul doit être au premier niveau/
		);
	});

	it('programme de calcul comme option d’un bloc choix : refusé', () => {
		const option = ['- ```calcul', `  ${ATTENDU}`, '  ```'];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('programme de calcul : la case et sa réponse', () => {
	it('réponse = essais + programme ; le même calcul écrit autrement : juste', () => {
		const instance = generate(
			template({
				statement: `Choisir un nombre, ajouter 2, multiplier par 4.\n\n${calcul(ATTENDU)}`
			})
		);
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.type, b.construire])).toEqual([
			[`${DEFAUT} | ${BO}`, 'text', 'calcul']
		]);
		expect(instance.blanks?.[0].expectedAnswerLatex).toBe(BO);
		for (const juste of [BO, DEVELOPPE, EN_ETAPES]) {
			expect(validateAnswer([juste], instance, [juste]).status).toBe('correct');
			expect(isBlankValueCorrect(juste, instance.blanks![0], instance)).toBe(true);
		}
		expect(
			validateAnswer(['afficher nombre + 2 × 4'], instance, ['afficher nombre + 2 × 4']).isCorrect
		).toBe(false);
		expect(validateAnswer([''], instance, ['']).isCorrect).toBe(false);
	});

	it('essais: donnés par l’auteur : dans la réponse attendue', () => {
		const instance = generate(template({ statement: calcul(ATTENDU, 'essais: 2') }));
		expect(instance.blanks?.[0].expectedAnswer).toBe(`2 | ${BO}`);
		// × 2 + 12 coïncide avec (n + 2) × 4 en 2 seulement : juste avec ce seul essai
		expect(isBlankValueCorrect('afficher nombre × 2 + 12', instance.blanks![0], instance)).toBe(
			true
		);
	});

	it('rien d’affiché, illisible, division par zéro : faux, avec le message', () => {
		const instance = generate(template({ statement: calcul(ATTENDU) }));
		expect(validateAnswer(['résultat = nombre'], instance, ['résultat = nombre']).feedback).toBe(
			'Ton programme n’affiche rien.'
		);
		expect(validateAnswer(['afficher ('], instance, ['afficher (']).feedback).toMatch(
			/Calcul incomplet/
		);
		expect(
			validateAnswer(['afficher 1 ÷ nombre'], instance, ['afficher 1 ÷ nombre']).feedback
		).toMatch(/Avec le nombre 0 : Division par zéro/);
	});

	it('variables : programme attendu sur l’énoncé résolu', () => {
		const instance = generate(
			template({
				statement: calcul('attendu: afficher (nombre + {{a}}) × {{b}}'),
				variables: [
					{ name: 'a', expression: '5' },
					{ name: 'b', expression: '-3' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe(`${DEFAUT} | afficher (nombre + 5) × -3`);
		expect(isBlankValueCorrect('afficher −3 × nombre − 15', instance.blanks![0], instance)).toBe(
			true
		);
	});

	it('attendu illisible, absent, muet ou en erreur : refusé au prof, avec la raison', () => {
		expect(generationErrors(template({ statement: calcul('attendu: afficher (') }))).toMatch(
			/Case 1 \(programme de calcul\).*Calcul incomplet/
		);
		expect(generationErrors(template({ statement: calcul('essais: 1') }))).toMatch(
			/il manque la ligne attendu:/
		);
		expect(generationErrors(template({ statement: calcul('attendu: résultat = 1') }))).toMatch(
			/n’affiche rien/
		);
		expect(
			generationErrors(template({ statement: calcul('attendu: afficher 1 ÷ nombre') }))
		).toMatch(/Division par zéro/);
	});

	it('`case:` ou `?` écrits par le prof : refusés', () => {
		expect(generationErrors(template({ statement: calcul('case: 0', ATTENDU) }))).toMatch(
			/case: est posée automatiquement/
		);
		expect(generationErrors(template({ statement: calcul('attendu: ?') }))).toMatch(
			/réservé à l’énoncé envoyé pendant une évaluation/
		);
	});

	it('réponse écrite dans blanks[] pour la case calcul : refusée', () => {
		expect(
			generationErrors(template({ statement: calcul(ATTENDU), blanks: [{ expectedAnswer: 'x' }] }))
		).toMatch(/Case 1.*programme du bloc calcul/);
	});

	it('bloc non fermé : refusé', () => {
		expect(
			generationErrors(
				template({ statement: ['Calcule.', '```calcul', ATTENDU, '', 'Fin.'].join('\n') })
			)
		).toMatch(/Case 1 \(programme de calcul\).*non fermé/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à programme de calcul', () => {
		const errors = validateTemplate(template({ statement: calcul(ATTENDU) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le bloc, la réponse attendue et le verdict', () => {
		const instance = generate(template({ statement: calcul(ATTENDU) }));
		const builds = buildExpectedResult(instance, { values: ['afficher nombre'] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({
			kind: 'build',
			buildKind: 'calcul',
			status: 'incorrect',
			expected: [`${DEFAUT} | ${BO}`]
		});
	});

	it('copie corrigée sans programme : « aucun programme »', () => {
		const instance = generate(template({ statement: calcul(ATTENDU) }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(JSON.stringify(lines)).toContain(EMPTY_PROGRAM_TEXT);
	});
});

describe('évaluation notée : l’énoncé envoyé ne dit pas le programme', () => {
	const META = { position: 0, delaySeconds: 20 };

	it('attendu: ?, essais et départ gardés', () => {
		const full = generate(
			template({ statement: calcul(ATTENDU, 'essais: 1 ; 3', 'départ: afficher nombre') })
		);
		const { statement } = toPublicQuestion(full, META);
		const body = statement.split('```calcul\n')[1].split('\n```')[0];
		expect(body).not.toContain('× 4');
		const node = parseCalculContent(body);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({ attendu: null, essais: [1, 3], depart: 'afficher nombre' });
		expect(node.caseIndex).toBe(0);
	});

	it('bloc cité ou en retrait : masqué aussi, et vu par la garde', () => {
		for (const statement of [
			['- Programme :', '', '  ```calcul', `  ${ATTENDU}`, '  ```'].join('\n'),
			['> ```calcul', `> ${ATTENDU}`, '> ```'].join('\n')
		]) {
			expect(findUnmaskedAnswers(statement)).toEqual(['calcul']);
			const masked = maskGestureAnswers(statement);
			expect(masked).not.toContain('nombre + 2');
			expect(masked).toMatch(/^( {2}|> )attendu: \?$/m);
			expect(findUnmaskedAnswers(masked)).toEqual([]);
		}
	});
});
