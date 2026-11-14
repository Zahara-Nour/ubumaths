/**
 * Question « programme tortue » (bloc ```tortue, chantier `blockly`, PR 4 ; journal
 * `docs/wip/blockly-progress.md`)
 *
 * Une case par bloc, réponse attendue = la comparaison et le programme de référence
 * (`position | répéter 4 [ … ]`), jamais écrite dans le modèle ; la réponse de l'élève (son
 * programme en notation texte) est rejouée par l'interpréteur et jugée sur son tracé.
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
import { parseTortueContent } from '$lib/ubumark/parser/tortue-parser';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-tortue',
		title: 'Programmer un carré',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CM1'],
		level: 1
	} as QuestionTemplate;
}

const tortue = (...body: string[]) => ['```tortue', ...body, '```'].join('\n');
const CARRE = 'répéter 4 [ avancer 3 ; tourner à droite 90 ]';
const ATTENDU = `attendu: ${CARRE}`;
const AUTRE_CHEMIN =
	'tourner à droite 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3';
const A_GAUCHE = 'répéter 4 [ avancer 3 ; tourner à gauche 90 ]';

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

describe('assignBlankIndices — programme tortue', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(tortue(ATTENDU));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(tortue('case: 0', ATTENDU));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'tortue', source: ATTENDU } });
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = ['- Trace un carré :', '', '  ```tortue', `  ${ATTENDU}`, '  ```'].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Un programme tortue doit être au premier niveau/
		);
	});

	it('programme tortue comme option d’un bloc choix : refusé', () => {
		const option = ['- ```tortue', `  ${ATTENDU}`, '  ```'];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('programme tortue : la case et sa réponse', () => {
	it('réponse = comparaison + programme ; même tracé par un autre chemin : juste', () => {
		const instance = generate(
			template({ statement: `Trace un carré de côté 3.\n\n${tortue(ATTENDU)}` })
		);
		expect(instance.blanks?.map((b) => [b.expectedAnswer, b.type, b.construire])).toEqual([
			[`position | ${CARRE}`, 'text', 'tortue']
		]);
		expect(instance.blanks?.[0].expectedAnswerLatex).toBe(CARRE);
		expect(validateAnswer([AUTRE_CHEMIN], instance, [AUTRE_CHEMIN]).status).toBe('correct');
		expect(validateAnswer([A_GAUCHE], instance, [A_GAUCHE]).isCorrect).toBe(false);
		expect(validateAnswer([''], instance, ['']).isCorrect).toBe(false);
		expect(isBlankValueCorrect(AUTRE_CHEMIN, instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect(A_GAUCHE, instance.blanks![0], instance)).toBe(false);
	});

	it('comparer: forme : le carré tourné à gauche est juste', () => {
		const instance = generate(template({ statement: tortue(ATTENDU, 'comparer: forme') }));
		expect(instance.blanks?.[0].expectedAnswer).toBe(`forme | ${CARRE}`);
		expect(isBlankValueCorrect(A_GAUCHE, instance.blanks![0], instance)).toBe(true);
	});

	it('programme qui ne se lit pas : faux, avec le message de la tortue', () => {
		const instance = generate(template({ statement: tortue(ATTENDU) }));
		const result = validateAnswer(['sauter 3'], instance, ['sauter 3']);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Instruction inconnue : « sauter 3 ».');
	});

	it('variables : programme attendu sur l’énoncé résolu', () => {
		const instance = generate(
			template({
				statement: tortue('attendu: répéter 4 [ avancer {{a}} ; tourner à droite 90 ]'),
				variables: [{ name: 'a', expression: '5' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe(
			'position | répéter 4 [ avancer 5 ; tourner à droite 90 ]'
		);
	});

	it('attendu illisible ou absent : refusé au prof, avec la raison', () => {
		expect(generationErrors(template({ statement: tortue('attendu: sauter 3') }))).toMatch(
			/Case 1 \(programme tortue\).*Instruction inconnue/
		);
		expect(generationErrors(template({ statement: tortue('montrer: oui') }))).toMatch(
			/il manque la ligne attendu:/
		);
	});

	it('`case:` ou `?` écrits par le prof : refusés', () => {
		expect(generationErrors(template({ statement: tortue('case: 0', ATTENDU) }))).toMatch(
			/case: est posée automatiquement/
		);
		expect(generationErrors(template({ statement: tortue('attendu: ?') }))).toMatch(
			/réservé à l’énoncé envoyé pendant une évaluation/
		);
	});

	it('réponse écrite dans blanks[] pour la case tortue : refusée', () => {
		expect(
			generationErrors(template({ statement: tortue(ATTENDU), blanks: [{ expectedAnswer: 'x' }] }))
		).toMatch(/Case 1.*programme du bloc tortue/);
	});

	it('bloc non fermé : refusé', () => {
		expect(
			generationErrors(
				template({ statement: ['Trace.', '```tortue', ATTENDU, '', 'Fin.'].join('\n') })
			)
		).toMatch(/Case 1 \(programme tortue\).*non fermé/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à programme tortue', () => {
		const errors = validateTemplate(template({ statement: tortue(ATTENDU) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le bloc, la réponse et son verdict', () => {
		const instance = generate(template({ statement: tortue(ATTENDU) }));
		const builds = buildExpectedResult(instance, { values: [A_GAUCHE] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({ kind: 'build', buildKind: 'tortue', status: 'incorrect' });
	});

	it('copie corrigée sans programme : « aucun programme »', () => {
		const instance = generate(template({ statement: tortue(ATTENDU) }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(JSON.stringify(lines)).toContain(EMPTY_PROGRAM_TEXT);
	});
});

describe('évaluation notée : l’énoncé envoyé ne dit pas le programme', () => {
	const META = { position: 0, delaySeconds: 20 };

	it('attendu: ?, figure non montrée : rien d’autre', () => {
		const full = generate(template({ statement: `Trace un carré.\n\n${tortue(ATTENDU)}` }));
		const { statement } = toPublicQuestion(full, META);
		const body = statement.split('```tortue\n')[1].split('\n```')[0];
		expect(body).not.toContain('avancer');
		expect(body).not.toContain('figure:');
		const node = parseTortueContent(body);
		expect(node.errors).toEqual([]);
		expect(node.spec?.attendu).toBeNull();
		expect(node.caseIndex).toBe(0);
	});

	it('montrer: oui : la figure part en segments, sans le programme', () => {
		const full = generate(template({ statement: tortue(ATTENDU, 'montrer: oui') }));
		const { statement } = toPublicQuestion(full, META);
		const body = statement.split('```tortue\n')[1].split('\n```')[0];
		expect(body).not.toContain('répéter');
		const node = parseTortueContent(body);
		expect(node.errors).toEqual([]);
		expect(node.spec?.modele).toHaveLength(4);
	});

	it('la garde voit un programme tortue non masqué', () => {
		expect(findUnmaskedAnswers(tortue(ATTENDU))).toEqual(['tortue']);
		expect(findUnmaskedAnswers(maskGestureAnswers(tortue(ATTENDU, 'montrer: oui')))).toEqual([]);
	});
});
