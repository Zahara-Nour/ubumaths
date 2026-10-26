/**
 * Bloc ```figure-de-travail (chantier figure-et-choix, lot 2, phase 0 validée par
 * David le 2026-10-26, `docs/wip/figure-et-choix-progress.md` § 2.3 et § 2.9)
 *
 * Une figure où l'élève PEUT tracer pour vérifier ; la réponse est ailleurs (case
 * choix, texte…). Elle occupe une case (son tracé est enregistré en évaluation)
 * mais n'est JAMAIS notée : la notation du serveur et celle de l'élève la retirent
 * avant toute autre règle (cases vides, appariement libre, « figure vide → 0 »).
 */
import { describe, it, expect } from 'vitest';
import '$lib/questions/construction/positions-setup';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { assignBlankIndices } from '$lib/questions/generator/assign-blank-indices';
import { gradeQuestion } from '$lib/questions/grading';
import { isWorkFigureBlank } from '$lib/questions/graded-part';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import { validateAnswer, validateAnswerDetailed } from '$lib/utils/answer-validator';
import { parseMarkdown } from '$lib/ubumark/parser';
import { WORK_FIGURE_ALONE_MESSAGE } from '$lib/ubumark/parser/construction-parser';
import { templateMarkdown } from '$lib/ubumark';
import type { FigureNode } from '$lib/ubumark/types/figure';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '$lib/questions/types';

// Constantes
const BODY = [
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'---',
	'A = point(2, 3)',
	'B = point(8, 5)',
	'C = point(5, 4.25)'
];
const WORK = ['```figure-de-travail', ...BODY, '```'].join('\n');
const TRACE = 'droite(2;3;8;5)';

// Functions
function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	options?: QuestionTemplate['options']
): QuestionTemplate {
	return {
		id: 'test-figure-de-travail',
		title: 'Points alignés',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CP'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...(options && { options })
	} as QuestionTemplate;
}

function generate(t: QuestionTemplate): QuestionInstance {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function errorsOf(t: QuestionTemplate): string[] {
	const result = generateInstance(t, 42);
	return result.success ? [] : result.errors;
}

function figureNode(markdown: string): FigureNode {
	const node = parseMarkdown(markdown).children[0];
	if (node?.type !== 'figure') throw new Error(`nœud figure attendu, reçu ${node?.type}`);
	return node;
}

/** CP-058 réécrit : figure de travail (case 0) puis case choix oui / non (case 1, « Non ») */
const CP058 = template({
	statement: `Les points A, B et C sont-ils alignés ? Tu peux tracer la droite (AB) pour vérifier.\n\n${WORK}\n\n\`\`\`choix\nmelanger: non\n- Oui\n- Non\n\`\`\``,
	blanks: [{ expectedAnswer: '1' }]
});

/** Figure de travail (case 0) et deux cases texte en appariement libre (cases 1 et 2) */
const DEUX_TEXTES = template(
	{
		statement: `Trace si tu veux.\n\n${WORK}\n\nDeux nombres pairs : [_] et [_]`,
		blanks: [{ expectedAnswer: '2' }, { expectedAnswer: '4' }]
	},
	{ orderIndependent: true }
);

/** Les deux notations : celle du serveur (évaluation) et celle de l'écran de l'élève */
function verdicts(instance: QuestionInstance, values: string[]) {
	const server = gradeQuestion(instance, { values });
	const client = validateAnswer(values, instance, values);
	return { server, client };
}

// Tests
describe('lecture du bloc ```figure-de-travail', () => {
	it('rend une figure de travail : outil, aucune vérification, aucune erreur', () => {
		const node = figureNode(WORK);
		expect(node.errors).toEqual([]);
		expect(node.construction).toEqual({ tools: ['droite'], checks: [], work: true });
		expect(node.script).toBe('A = point(2, 3)\nB = point(8, 5)\nC = point(5, 4.25)');
	});

	it('sans outils: la droite', () => {
		const node = figureNode(
			['```figure-de-travail', ...BODY.slice(0, 1), ...BODY.slice(2), '```'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.construction?.tools).toEqual(['droite']);
	});

	it('verifier: refusé, avec sa ligne', () => {
		const node = figureNode(
			['```figure-de-travail', BODY[0], 'verifier: droite_par A ; B', ...BODY.slice(1), '```'].join(
				'\n'
			)
		);
		expect(node.errors).toEqual([
			{
				message: 'Ligne 2 : une figure de travail n’est pas notée : pas de verifier:',
				line: 2
			}
		]);
	});

	it('outil inconnu refusé, comme pour la figure à compléter', () => {
		const node = figureNode(
			['```figure-de-travail', BODY[0], 'outils: compas', ...BODY.slice(2), '```'].join('\n')
		);
		expect(node.errors.map((e) => e.message)).toEqual([
			'Ligne 2 : outil « compas » inconnu (droite, segment)'
		]);
	});

	it('deplacable: refusé', () => {
		const node = figureNode(
			['```figure-de-travail', BODY[0], 'deplacable: oui', ...BODY.slice(1), '```'].join('\n')
		);
		expect(node.errors).toHaveLength(1);
		expect(node.errors[0].message).toContain('deplacable');
	});
});

describe('numérotation : le bloc porte UNE case, mise à l’abri', () => {
	it('case posée dans le bloc, figure de travail repérée', () => {
		const result = assignBlankIndices(`${WORK}\n\nRéponse : [_]`);
		expect(result.totalBlanks).toBe(2);
		expect(result.statement).toContain('```figure-de-travail\ncase: 0\n');
		expect(result.workFigureBlanks).toEqual({ 0: BODY.join('\n') });
		expect(result.constructionBlanks).toBeUndefined();
	});

	it('ni ? ni [_] dans le bloc ne crée de case', () => {
		const block = ['```figure-de-travail', 'description: [_] ?', ...BODY, '```'].join('\n');
		expect(assignBlankIndices(block).totalBlanks).toBe(1);
	});

	it('dans une liste : refusé', () => {
		const nested = WORK.split('\n')
			.map((line) => `  ${line}`)
			.join('\n');
		expect(assignBlankIndices(`- point\n${nested}`).constructionErrors).toEqual([
			'Un bloc figure-de-travail doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('génération', () => {
	it('CP-058 : une case figure de travail (sans réponse attendue) puis la case choix', () => {
		const instance = generate(CP058);
		expect(instance.blanks).toHaveLength(2);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'graphical',
			expectedAnswer: '',
			construction: { checks: [], work: true }
		});
		expect(instance.blanks?.[0].construction?.source).toContain('A = point(2, 3)');
		expect(instance.blanks?.[1].type).toBe('choice');
	});

	it('une question dont la seule case est une figure de travail est refusée', () => {
		expect(errorsOf(template({ statement: `Trace.\n\n${WORK}` }))).toEqual([
			`Variation 1: ${WORK_FIGURE_ALONE_MESSAGE}`
		]);
		// blanks[] écrit (l'éditeur en donne un par case) : refus du générateur
		expect(
			errorsOf(template({ statement: `Trace.\n\n${WORK}`, blanks: [{ expectedAnswer: '' }] }))
		).toEqual([WORK_FIGURE_ALONE_MESSAGE]);
	});

	it('figure de travail ET une case, blanks[] oublié : le message ordinaire', () => {
		expect(errorsOf(template({ statement: `${WORK}\n\n$x = ?$` }))).toEqual([
			'Variation 1: fill_in_blanks requires blanks[]'
		]);
	});

	it('verifier: dans une figure de travail : erreur de la case', () => {
		const block = [
			'```figure-de-travail',
			BODY[0],
			'verifier: droite_par A ; B',
			...BODY.slice(1),
			'```'
		].join('\n');
		const errors = errorsOf(
			template({ statement: `${block}\n\nRéponse : [_]`, blanks: [{ expectedAnswer: 'oui' }] })
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('Case 1 (bloc figure-de-travail)');
		expect(errors[0]).toContain('pas de verifier:');
	});

	it('se combine avec « ordre indifférent » (elle n’est jamais appariée)', () => {
		expect(errorsOf(DEUX_TEXTES)).toEqual([]);
	});
});

describe('notation : la figure de travail ne compte jamais (serveur ET élève)', () => {
	const instance = generate(CP058);

	it('choix juste, figure vide → 1 point', () => {
		const { server, client } = verdicts(instance, ['', '1']);
		expect(server).toMatchObject({ status: 'correct', points: 1, isCorrect: true, partial: false });
		expect(client.isCorrect).toBe(true);
		expect(client.feedback).toBeUndefined();
	});

	it('choix juste, figure tracée → 1 point', () => {
		const { server, client } = verdicts(instance, [TRACE, '1']);
		expect(server).toMatchObject({ status: 'correct', points: 1 });
		expect(client.isCorrect).toBe(true);
	});

	it('choix faux → 0, quel que soit le tracé', () => {
		for (const trace of ['', TRACE]) {
			const { server, client } = verdicts(instance, [trace, '0']);
			expect(server).toMatchObject({ status: 'incorrect', points: 0 });
			expect(client.isCorrect).toBe(false);
		}
	});

	it('choix vide → « rien répondu », même figure tracée', () => {
		for (const trace of ['', TRACE]) {
			const { server, client } = verdicts(instance, [trace, '']);
			expect(server).toMatchObject({ status: 'empty', points: 0 });
			expect(client.status).toBe('empty');
			expect(client.feedback).not.toBe("Tu n'as pas tout complété.");
		}
	});

	it('tracé illisible : ignoré, le choix seul compte', () => {
		const { server } = verdicts(instance, ['n’importe quoi', '1']);
		expect(server).toMatchObject({ status: 'correct', points: 1 });
	});

	it('nombre de valeurs différent du nombre de cases : 0 (réponse fabriquée)', () => {
		expect(gradeQuestion(instance, { values: ['1'] })).toMatchObject({ points: 0 });
	});

	it('verdict par case : la figure de travail est marquée non notée, à sa place', () => {
		const detail = validateAnswerDetailed(instance, { values: [TRACE, '1'] });
		expect(detail.status).toBe('correct');
		expect(detail.blanks.map((b) => b.index)).toEqual([0, 1]);
		expect(detail.blanks[0]).toMatchObject({ ungraded: true, answer: TRACE });
		expect(detail.blanks[1]).toMatchObject({ status: 'correct' });
	});
});

describe('notation : appariement libre de deux cases texte', () => {
	const instance = generate(DEUX_TEXTES);

	it('justes dans un ordre ou l’autre, figure vide ou tracée → 1 point', () => {
		for (const values of [
			['', '2', '4'],
			['', '4', '2'],
			[TRACE, '4', '2']
		]) {
			const { server, client } = verdicts(instance, values);
			expect(server.points).toBe(1);
			expect(client.isCorrect).toBe(true);
		}
	});

	it('le tracé n’est jamais apparié à une case texte', () => {
		// « 2 » tapé, la seconde case vide : ½ (une case vide sur deux), pas 1 grâce au tracé
		const { server } = verdicts(instance, [TRACE, '2', '']);
		expect(server).toMatchObject({ status: 'unoptimal_form', points: 0.5, partial: true });
	});

	it('cases texte vides, figure tracée → « rien répondu »', () => {
		const { server } = verdicts(instance, [TRACE, '', '']);
		expect(server).toMatchObject({ status: 'empty', points: 0 });
	});
});

describe('version publique (évaluation notée)', () => {
	it('la case dit seulement « figure de travail » ; le navigateur la laisse vide', () => {
		const question = toPublicQuestion(generate(CP058), { position: 0, delaySeconds: 20 });
		expect(question.blanks?.[0]).toEqual({ type: 'graphical', workFigure: true });
		const display = toDisplayInstance(question);
		expect(isWorkFigureBlank(display.blanks?.[0])).toBe(true);
		expect(isWorkFigureBlank(display.blanks?.[1])).toBe(false);
	});
});
