/**
 * Question « robot à produire » (bloc ```robot + `produire: oui`, chantier `suite-fleches` ;
 * journal `docs/wip/suite-fleches-progress.md`)
 *
 * Une case par bloc, réponse attendue = la scène et un code le plus court
 * (`flèches 8x5 2,1 6,4 | → → → → ↑ ↑ ↑`), jamais écrite dans le modèle ; le code de l'élève
 * est rejoué sur la scène : tout code qui finit sur l'arrivée est juste.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { isBlankValueCorrect, validateAnswer } from '#lib/utils/answer-validator.ts';
import { buildExpectedResult, EMPTY_CODE_TEXT } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { findUnmaskedAnswers } from '../../masked-statement';
import { parseRobotContent } from '#lib/ubumark/parser/robot-parser.ts';
import { ROBOT_AILLEURS, ROBOT_SORTIE } from '#lib/ubumark/utils/robot-answer.ts';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-robot',
		title: 'Coder un déplacement',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CE1'],
		level: 1
	} as QuestionTemplate;
}

const robot = (...body: string[]) => ['```robot', ...body, '```'].join('\n');
const SCENE = ['quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4'];
const PRODUIRE = [...SCENE, 'produire: oui'];

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	expect(result.success).toBe(false);
	return result.success ? '' : result.errors.join(' ; ');
}

describe('assignBlankIndices — robot à produire', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(robot(...PRODUIRE));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(robot('case: 0', ...PRODUIRE));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'robot', source: PRODUIRE.join('\n') } });
	});

	it('robot d’affichage (sans produire) : aucune case', () => {
		const result = assignBlankIndices(robot(...SCENE));
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(robot(...SCENE));
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = [
			'- Code :',
			'',
			'  ```robot',
			...PRODUIRE.map((l) => `  ${l}`),
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Un robot à produire doit être au premier niveau/
		);
	});

	it('robot à produire comme option d’un bloc choix : refusé', () => {
		const option = ['- ```robot', ...PRODUIRE.map((l) => `  ${l}`), '  ```'];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('robot à produire : la case et sa réponse', () => {
	it('réponse = scène + code ; un autre chemin juste est juste', () => {
		const instance = generate(
			template({
				statement: `Écris le code qui mène le robot à la case verte.\n\n${robot(...PRODUIRE)}`
			})
		);
		const blank = instance.blanks![0];
		expect([blank.type, blank.construire]).toEqual(['text', 'robot']);
		expect(blank.expectedAnswer).toMatch(/^flèches 8x5 2,1 6,4 \| /);
		// Le corrigé montre le code seul
		expect(blank.expectedAnswerLatex).not.toContain('|');
		expect(blank.expectedAnswerLatex?.split(' ')).toHaveLength(7);
		expect(validateAnswer(['↑ ↑ ↑ → → → →'], instance, ['↑ ↑ ↑ → → → →']).status).toBe('correct');
		expect(isBlankValueCorrect('→ → → → ↑ ↑ ↑', blank, instance)).toBe(true);
		expect(isBlankValueCorrect('→ → → ↑ ↑ ↑', blank, instance)).toBe(false);
	});

	it('faux : la raison en retour', () => {
		const instance = generate(template({ statement: robot(...PRODUIRE) }));
		expect(validateAnswer(['↓'], instance, ['↓']).feedback).toBe(ROBOT_SORTIE);
		expect(validateAnswer(['↑'], instance, ['↑']).feedback).toBe(ROBOT_AILLEURS);
		expect(validateAnswer([''], instance, ['']).isCorrect).toBe(false);
	});

	it('avance-pivote', () => {
		const instance = generate(
			template({
				statement: robot(
					'quadrillage: 8 x 5',
					'codage: avance-pivote',
					'départ: 2, 1, droite',
					'arrivée: 6, 4',
					'produire: oui'
				)
			})
		);
		expect(instance.blanks?.[0].expectedAnswerLatex).toBe(
			'avance de 4, pivote à gauche, avance de 3'
		);
		const code = 'pivote à gauche, avance de 3, pivote à droite, avance de 4';
		expect(validateAnswer([code], instance, [code]).status).toBe('correct');
	});

	it('variables : tirage sans code possible refait (condition implicite)', () => {
		const t = template({
			statement: robot(
				'quadrillage: 8 x 5',
				'départ: 1, 1',
				'arrivée: {{if:a==1|8, 5|6, 4}}',
				'interdites: 7, 5 ; 8, 4',
				'produire: oui'
			),
			variables: [{ name: 'a', expression: '1..2' }]
		});
		for (let seed = 0; seed < 20; seed++) {
			expect(generate(t, seed).blanks?.[0].expectedAnswer).toMatch(/ 6,4 7,5 8,4 \| /);
		}
	});

	it('aucun tirage possible : refusé au prof, avec la raison', () => {
		expect(
			generationErrors(
				template({
					statement: robot(
						'quadrillage: 8 x 5',
						'départ: 1, 1',
						'arrivée: 8, 5',
						'interdites: 7, 5 ; 8, 4',
						'produire: oui'
					)
				})
			)
		).toMatch(/aucun code de 15 instructions/);
	});

	it('case hors du quadrillage à un tirage : erreur d’auteur, pas de tirage refait en silence', () => {
		const t = template({
			statement: robot('quadrillage: 8 x 5', 'départ: 1, 1', 'arrivée: {{a}}, 4', 'produire: oui'),
			variables: [{ name: 'a', expression: '1..10' }]
		});
		const echecs = Array.from({ length: 30 }, (_, seed) => generateInstance(t, seed)).filter(
			(r) => !r.success
		);
		expect(echecs.length).toBeGreaterThan(0);
		expect(echecs[0].success ? '' : echecs[0].errors.join(' ')).toMatch(/hors du quadrillage/);
	});

	it('{{random:…}} dans le bloc : refusé (le tirage ne pourrait pas être vérifié)', () => {
		expect(
			generationErrors(
				template({
					statement: robot(
						'quadrillage: 8 x 5',
						'départ: 1, 1',
						'arrivée: {{random:5..8}}, 5',
						'produire: oui'
					)
				})
			)
		).toMatch(/pas de \{\{random:…\}\} dans le bloc/);
	});

	it('bloc mal écrit : refusé au prof', () => {
		expect(
			generationErrors(template({ statement: robot('départ: 1, 1', 'produire: oui') }))
		).toMatch(/Case 1 \(robot à produire\).*il manque la ligne quadrillage/);
	});

	it('`case:` écrite par le prof : refusée', () => {
		expect(generationErrors(template({ statement: robot('case: 0', ...PRODUIRE) }))).toMatch(
			/case: est posée automatiquement/
		);
	});

	it('réponse écrite dans blanks[] pour la case robot : refusée', () => {
		expect(
			generationErrors(
				template({ statement: robot(...PRODUIRE), blanks: [{ expectedAnswer: 'x' }] })
			)
		).toMatch(/Case 1.*code du robot/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à robot à produire', () => {
		const errors = validateTemplate(template({ statement: robot(...PRODUIRE) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le bloc, la réponse et son verdict', () => {
		const instance = generate(template({ statement: robot(...PRODUIRE) }));
		const builds = buildExpectedResult(instance, { values: ['↑'] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({ kind: 'build', buildKind: 'robot', status: 'incorrect' });
	});

	it('copie corrigée sans code : « aucun code »', () => {
		const instance = generate(template({ statement: robot(...PRODUIRE) }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(JSON.stringify(lines)).toContain(EMPTY_CODE_TEXT);
	});
});

describe('évaluation notée : rien à masquer', () => {
	it('l’énoncé envoyé garde la scène (elle ne dit pas le code)', () => {
		const full = generate(template({ statement: robot(...PRODUIRE) }));
		const { statement } = toPublicQuestion(full, { position: 0, delaySeconds: 20 });
		const body = statement.split('```robot\n')[1].split('\n```')[0];
		const node = parseRobotContent(body);
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(0);
		expect(findUnmaskedAnswers(statement)).toEqual([]);
	});
});
